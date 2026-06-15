import { DEFAULT_READER_THEME } from '@novel-reader/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '@/src/api';
import { deviceStorage } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

export default function LocalReaderScreen() {
  const { shelfItemId } = useLocalSearchParams<{ shelfItemId: string }>();
  const [title, setTitle] = useState('');
  const [chapters, setChapters] = useState<
    Array<{ id: string; title: string; index: number; sourceChapterUrl?: string }>
  >([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const shelf = (await deviceStorage.getShelf()).find((s) => s.id === shelfItemId);
      if (!shelf) {
        setError('书籍不存在');
        setLoading(false);
        return;
      }
      setTitle(shelf.title);
      const source = await deviceStorage.getSourceById(shelf.sourceId);
      if (!source) {
        setError('书源不存在');
        setLoading(false);
        return;
      }
      try {
        const toc = await api.guestToc(source.legadoConfig, shelf.bookUrl);
        setChapters(toc);
        const p = await deviceStorage.getProgress(shelf.id);
        if (p) setChapterIndex(p.chapterIndex);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [shelfItemId]);

  useEffect(() => {
    (async () => {
      if (!shelfItemId || !chapters[chapterIndex]) return;
      const shelf = (await deviceStorage.getShelf()).find((s) => s.id === shelfItemId);
      const source = shelf ? await deviceStorage.getSourceById(shelf.sourceId) : null;
      const ch = chapters[chapterIndex];
      if (!source || !ch.sourceChapterUrl) return;
      const r = await api.guestContent(source.legadoConfig, ch.sourceChapterUrl);
      setContent(r.content.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim());
      await deviceStorage.saveProgress(shelfItemId, chapterIndex);
    })();
  }, [chapters, chapterIndex, shelfItemId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const theme = DEFAULT_READER_THEME;

  return (
    <View style={[styles.page, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.reader} showsVerticalScrollIndicator={false}>
        <Text style={[styles.chapterTitle, { color: theme.textColor }]}>
          {chapters[chapterIndex]?.title ?? title}
        </Text>
        <Text style={[styles.body, { color: theme.textColor, fontSize: theme.fontSize, lineHeight: theme.fontSize * theme.lineHeight }]}>
          {content}
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[styles.navBtn, chapterIndex === 0 && styles.disabled]}
          disabled={chapterIndex === 0}
          onPress={() => setChapterIndex((i) => i - 1)}
        >
          <Text style={styles.navText}>上一章</Text>
        </Pressable>
        <Text style={styles.progress}>
          {chapterIndex + 1}/{chapters.length}
        </Text>
        <Pressable
          style={[styles.navBtn, chapterIndex >= chapters.length - 1 && styles.disabled]}
          disabled={chapterIndex >= chapters.length - 1}
          onPress={() => setChapterIndex((i) => i + 1)}
        >
          <Text style={styles.navText}>下一章</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: layout.pad },
  error: { color: colors.danger },
  reader: { padding: 20, paddingBottom: 80 },
  chapterTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  body: { textAlign: 'justify' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  navBtn: { padding: 10 },
  navText: { color: colors.primary, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  progress: { color: colors.muted, fontSize: 13 },
});
