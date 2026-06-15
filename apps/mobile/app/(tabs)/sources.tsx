import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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
import { api, getToken } from '@/src/api';
import { deviceStorage, type DeviceSource } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

export default function SourcesScreen() {
  const [sources, setSources] = useState<DeviceSource[]>([]);
  const [json, setJson] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const load = useCallback(async () => {
    setLoggedIn(!!(await getToken()));
    setSources(await deviceStorage.getSources());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const importJson = async () => {
    try {
      const data = JSON.parse(json) as LegadoBookSource | LegadoBookSource[];
      const list = Array.isArray(data) ? data : [data];
      await deviceStorage.importSources(list);
      setMsg(`已导入 ${list.length} 个书源到手机本地`);
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
      const list = Array.isArray(data) ? data : [data];
      await deviceStorage.importSources(list as LegadoBookSource[]);
      setMsg('订阅链接导入成功，已保存到手机');
      load();
    } catch (e) {
      Alert.alert('导入失败', e instanceof Error ? e.message : '无法拉取订阅');
    }
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
    } catch (e) {
      Alert.alert('失败', e instanceof Error ? e.message : '导入失败');
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.banner}>
        书源保存在手机本地（AsyncStorage），不依赖浏览器。登录后云端书源另行同步。
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

      <Pressable style={styles.outlineBtn} onPress={importFromStore}>
        <Text style={styles.outlineText}>从书源商店快速导入一本</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>已导入 ({sources.length})</Text>
      {sources.map((s) => (
        <View key={s.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.group}>{s.group}</Text>
          </View>
          <Switch
            value={s.enabled}
            onValueChange={async (v) => {
              await deviceStorage.toggleSource(s.id, v);
              load();
            }}
          />
        </View>
      ))}
      {sources.length === 0 && <Text style={styles.empty}>暂无书源</Text>}
      {loggedIn && (
        <Text style={styles.note}>已登录用户：云端书源请在网页端管理，手机端书源始终保存在本机。</Text>
      )}
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
  msg: { color: colors.success, fontSize: 14 },
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  group: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 8 },
  note: { fontSize: 12, color: colors.muted, lineHeight: 18 },
});
