import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LegadoBookSource } from '@novel-reader/shared';
import { parseLegadoImportPayload } from '@novel-reader/shared';
import { DEMO_MOCK_SOURCE } from '@novel-reader/book-engine/demo';
import { api } from '@/src/api';
import { deviceStorage, type DeviceSource } from '@/src/lib/deviceStorage';
import { localTestSources } from '@/src/lib/localEngine';
import { colors, layout } from '@/src/theme';

type TestResult = {
  success: boolean;
  count?: number;
  error?: string;
};

function formatImportMessage(imported: number, skipped?: Array<{ name: string; reason: string }>) {
  if (!skipped?.length) return `导入成功，共 ${imported} 个书源`;
  return `导入成功 ${imported} 个，跳过 ${skipped.length} 个不兼容书源`;
}

function healthLabel(source: DeviceSource, testResults: Record<string, TestResult>) {
  const live = testResults[source.id];
  if (live) return live.success ? '可用' : '不可用';
  if (source.healthStatus === 'healthy') return '可用';
  if (source.healthStatus === 'offline') return '不可用';
  return '未测试';
}

function healthColor(label: string) {
  if (label === '可用') return { bg: '#ecfdf5', text: colors.success };
  if (label === '不可用') return { bg: '#fef2f2', text: colors.danger };
  return { bg: '#f1f5f9', text: colors.muted };
}

export default function SourcesScreen() {
  const [sources, setSources] = useState<DeviceSource[]>([]);
  const [json, setJson] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState(false);
  const [testKeyword, setTestKeyword] = useState('测试');

  const load = useCallback(async () => {
    setSources(await deviceStorage.getSources());
    setSelected(new Set());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(sources.map((s) => s.id)));
  const clearSelection = () => setSelected(new Set());

  const selectFailed = () => {
    const failed = sources
      .filter((s) => healthLabel(s, testResults) === '不可用')
      .map((s) => s.id);
    setSelected(new Set(failed));
  };

  const applyTestResults = (
    results: Array<{ id: string; success: boolean; count?: number; error?: string }>,
  ) => {
    setTestResults((prev) => {
      const next = { ...prev };
      for (const r of results) {
        next[r.id] = { success: r.success, count: r.count, error: r.error };
      }
      return next;
    });
    for (const r of results) {
      deviceStorage.updateHealth(r.id, r.success ? 'healthy' : 'offline');
    }
  };

  const runTests = async (ids: string[]) => {
    if (ids.length === 0) {
      setMsg('请先选择要测试的书源');
      return;
    }
    setTesting(true);
    setMsg(`正在测试 ${ids.length} 个书源…`);
    try {
      const items = ids
        .map((id) => {
          const src = sources.find((s) => s.id === id);
          return src ? { id, source: src.legadoConfig } : null;
        })
        .filter(Boolean) as Array<{ id: string; source: LegadoBookSource }>;
      const batch = await localTestSources(items, testKeyword);
      applyTestResults(batch.results);
      setMsg(`测试完成：可用 ${batch.passed} 个，不可用 ${batch.failed} 个`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const testOne = async (id: string) => {
    setTesting(true);
    try {
      const src = sources.find((s) => s.id === id);
      if (!src) return;
      const batch = await localTestSources([{ id, source: src.legadoConfig }], testKeyword);
      applyTestResults(batch.results);
      const r = batch.results[0];
      setMsg(r?.success ? '测试通过' : `测试失败: ${r?.error ?? ''}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '测试失败');
    } finally {
      setTesting(false);
    }
  };

  const deleteIds = (ids: string[]) => {
    if (ids.length === 0) {
      setMsg('请先选择要删除的书源');
      return;
    }
    Alert.alert('确认删除', `确定删除 ${ids.length} 个书源？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deviceStorage.removeSources(ids);
          setTestResults((prev) => {
            const next = { ...prev };
            for (const id of ids) delete next[id];
            return next;
          });
          setMsg(`已删除 ${ids.length} 个书源`);
          load();
        },
      },
    ]);
  };

  const importJson = async () => {
    try {
      const data = JSON.parse(json) as LegadoBookSource | LegadoBookSource[];
      const { sources: parsed, skipped } = parseLegadoImportPayload(data);
      if (parsed.length === 0) {
        setMsg('书源 JSON 格式不正确');
        return;
      }
      await deviceStorage.importSources(parsed as LegadoBookSource[]);
      setMsg(formatImportMessage(parsed.length, skipped));
      setJson('');
      load();
    } catch (e) {
      Alert.alert('导入失败', e instanceof Error ? e.message : 'JSON 格式错误');
    }
  };

  const pasteJson = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setJson(text);
  };

  const importUrl = async () => {
    try {
      const res = await fetch(subUrl);
      const data = await res.json();
      const { sources: parsed, skipped } = parseLegadoImportPayload(data);
      if (parsed.length === 0) {
        setMsg('书源 JSON 格式不正确');
        return;
      }
      await deviceStorage.importSources(parsed as LegadoBookSource[]);
      setMsg(formatImportMessage(parsed.length, skipped));
      load();
    } catch (e) {
      Alert.alert('导入失败', e instanceof Error ? e.message : '无法拉取订阅');
    }
  };

  const importDemoSource = async () => {
    await deviceStorage.importSources([DEMO_MOCK_SOURCE]);
    setMsg(`已导入「${DEMO_MOCK_SOURCE.bookSourceName}」到手机（离线可用）`);
    load();
  };

  const importFromStore = async () => {
    try {
      const items = await api.sourceStore();
      const first = items[0];
      const config = first?.legadoConfig as LegadoBookSource | undefined;
      if (!config) {
        Alert.alert('提示', '书源商店暂无可用配置');
        return;
      }
      await deviceStorage.importSources([config]);
      setMsg(`已导入「${config.bookSourceName}」到手机`);
      load();
    } catch {
      await importDemoSource();
    }
  };

  const importFromFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const res = await fetch(result.assets[0].uri);
      const text = await res.text();
      const data = JSON.parse(text) as LegadoBookSource | LegadoBookSource[];
      const { sources: parsed, skipped } = parseLegadoImportPayload(data);
      if (parsed.length === 0) {
        setMsg('书源 JSON 格式不正确');
        return;
      }
      await deviceStorage.importSources(parsed as LegadoBookSource[]);
      setMsg(formatImportMessage(parsed.length, skipped));
      load();
    } catch (e) {
      Alert.alert('导入失败', e instanceof Error ? e.message : '无法读取文件');
    }
  };

  const selectedIds = useMemo(() => [...selected], [selected]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.banner}>
        书源保存在手机本地，搜索与阅读在设备上执行（无需服务器）。可批量测试并删除不可用书源。
      </Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>粘贴 Legado JSON</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={json}
          onChangeText={setJson}
          placeholder='[{"bookSourceName":"..."}]'
          placeholderTextColor={colors.muted}
        />
        <View style={styles.row}>
          <Pressable style={styles.secondaryBtn} onPress={pasteJson}>
            <Text style={styles.secondaryText}>从剪贴板粘贴</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={importFromFile}>
            <Text style={styles.secondaryText}>从文件</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={importJson}>
            <Text style={styles.primaryText}>导入到手机</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>书源订阅链接</Text>
        <TextInput
          style={styles.input}
          value={subUrl}
          onChangeText={setSubUrl}
          placeholder="https://..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
        />
        <Pressable style={styles.primaryBtn} onPress={importUrl}>
          <Text style={styles.primaryText}>从 URL 导入</Text>
        </Pressable>
      </View>

      <Pressable style={styles.outlineBtn} onPress={importDemoSource}>
        <Text style={styles.outlineText}>导入内置演示书源（离线测试）</Text>
      </Pressable>
      <Pressable style={styles.outlineBtn} onPress={importFromStore}>
        <Text style={styles.outlineText}>从书源商店快速导入（需服务器）</Text>
      </Pressable>

      {sources.length > 0 && (
        <View style={styles.toolbar}>
          <TextInput
            style={styles.keywordInput}
            value={testKeyword}
            onChangeText={setTestKeyword}
            placeholder="测试词"
            placeholderTextColor={colors.muted}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
            <Pressable style={styles.toolBtn} onPress={selectAll} disabled={testing}>
              <Text style={styles.toolText}>全选</Text>
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={clearSelection} disabled={testing}>
              <Text style={styles.toolText}>取消</Text>
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={selectFailed} disabled={testing}>
              <Text style={styles.toolText}>选中不可用</Text>
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={() => runTests(selectedIds)} disabled={testing}>
              <Text style={styles.toolText}>测试选中</Text>
            </Pressable>
            <Pressable style={styles.toolBtn} onPress={() => runTests(sources.map((s) => s.id))} disabled={testing}>
              <Text style={styles.toolText}>测试全部</Text>
            </Pressable>
            <Pressable style={[styles.toolBtn, styles.dangerBtn]} onPress={() => deleteIds(selectedIds)} disabled={testing}>
              <Text style={[styles.toolText, styles.dangerText]}>删除选中</Text>
            </Pressable>
          </ScrollView>
          {testing && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
        </View>
      )}

      <Text style={styles.sectionTitle}>已导入 ({sources.length})</Text>
      {sources.map((s) => {
        const label = healthLabel(s, testResults);
        const badge = healthColor(label);
        const checked = selected.has(s.id);
        return (
          <View key={s.id} style={styles.card}>
            <Pressable style={styles.checkArea} onPress={() => toggleSelect(s.id)} disabled={testing}>
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{s.name}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{label}</Text>
                </View>
              </View>
              <Text style={styles.group}>{s.group}</Text>
              {testResults[s.id]?.error && (
                <Text style={styles.errText} numberOfLines={1}>
                  {testResults[s.id].error}
                </Text>
              )}
            </View>
            <Switch
              value={s.enabled}
              onValueChange={async (v) => {
                await deviceStorage.toggleSource(s.id, v);
                load();
              }}
            />
            <Pressable onPress={() => testOne(s.id)} disabled={testing} style={styles.actionBtn}>
              <Text style={styles.actionText}>测试</Text>
            </Pressable>
            <Pressable onPress={() => deleteIds([s.id])} disabled={testing} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: colors.danger }]}>删</Text>
            </Pressable>
          </View>
        );
      })}
      {sources.length === 0 && <Text style={styles.empty}>暂无书源</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: layout.pad, gap: 14, paddingBottom: 40 },
  banner: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 20,
  },
  msg: { color: colors.primary, fontSize: 14 },
  section: {
    backgroundColor: colors.card,
    borderRadius: layout.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 13 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  outlineText: { color: colors.primary, fontWeight: '600' },
  toolbar: { gap: 8 },
  keywordInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    backgroundColor: colors.card,
    width: 100,
  },
  toolRow: { gap: 8, paddingVertical: 4 },
  toolBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  toolText: { fontSize: 13, color: colors.text },
  dangerBtn: { borderColor: '#fecaca' },
  dangerText: { color: colors.danger },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  checkArea: { padding: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  group: { fontSize: 12, color: colors.muted, marginTop: 2 },
  errText: { fontSize: 11, color: colors.danger, marginTop: 2 },
  actionBtn: { paddingHorizontal: 4, paddingVertical: 6 },
  actionText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 8 },
});
