import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, getToken } from '@/src/api';
import { deviceStorage } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const token = await getToken();
      let r: Array<Record<string, unknown>>;

      if (token) {
        r = await api.search(q);
      } else {
        const sources = await deviceStorage.getEnabledConfigs();
        if (sources.length === 0) {
          setMsg('请先在「书源」页导入并启用书源');
          setResults([]);
          return;
        }
        const raw = await api.guestSearch(q, sources);
        const enabled = (await deviceStorage.getSources()).filter((s) => s.enabled);
        r = raw.map((item) => {
          const idx = Number(String(item.sourceId).replace('guest-', ''));
          return { ...item, sourceId: enabled[idx]?.id ?? item.sourceId };
        });
      }
      setResults(r);
      if (r.length === 0) setMsg('未找到结果');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const addShelf = async (item: Record<string, unknown>) => {
    try {
      const token = await getToken();
      if (token) {
        await api.addToShelf({
          sourceId: item.sourceId,
          bookUrl: item.bookUrl,
          title: item.name,
          author: item.author,
          coverUrl: item.coverUrl,
          intro: item.intro,
        });
        setMsg(`已加入云端书架：${item.name}`);
      } else {
        await deviceStorage.addToShelf({
          title: String(item.name),
          author: String(item.author),
          sourceId: String(item.sourceId),
          bookUrl: String(item.bookUrl),
          coverUrl: item.coverUrl ? String(item.coverUrl) : undefined,
          intro: item.intro ? String(item.intro) : undefined,
        });
        setMsg(`已加入手机书架：${item.name}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '加入书架失败');
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="书名或作者"
          placeholderTextColor={colors.muted}
          onSubmitEditing={search}
        />
        <Pressable style={styles.btn} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>搜索</Text>}
        </Pressable>
      </View>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{String(item.name)}</Text>
              <Text style={styles.sub}>
                {String(item.author)} · {String(item.sourceName)}
              </Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => addShelf(item)}>
              <Text style={styles.addText}>加入书架</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', gap: 8, padding: layout.pad },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  msg: { paddingHorizontal: layout.pad, color: colors.primary, marginBottom: 8 },
  list: { padding: layout.pad, gap: 10, paddingTop: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: layout.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  addBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  addText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
