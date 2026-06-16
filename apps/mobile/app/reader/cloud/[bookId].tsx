import { DEFAULT_READER_THEME } from '@novel-reader/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChapterContent } from '@/components/ChapterContent';
import { api } from '@/src/api';
import { colors, layout } from '@/src/theme';

export default function CloudReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [chapters, setChapters] = useState<Array<{ id: string; title: string; index: number }>>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getChapters(bookId).then((c) => {
      setChapters(c);
      setLoading(false);
    });
  }, [bookId]);

  useEffect(() => {
    const ch = chapters[chapterIndex];
    if (!ch) return;
    api.getChapterContent(ch.id).then((r) => setContent(r.content));
  }, [chapters, chapterIndex]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const theme = DEFAULT_READER_THEME;

  return (
    <View style={[styles.page, { backgroundColor: theme.backgroundColor }]}>
      <View style={styles.reader}>
        <Text style={[styles.chapterTitle, { color: theme.textColor }]}>
          {chapters[chapterIndex]?.title}
        </Text>
        <ChapterContent content={content} theme={theme} />
      </View>
      <View style={styles.footer}>
        <Pressable
          disabled={chapterIndex === 0}
          onPress={() => setChapterIndex((i) => i - 1)}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>上一章</Text>
        </Pressable>
        <Text style={styles.progress}>
          {chapterIndex + 1}/{chapters.length}
        </Text>
        <Pressable
          disabled={chapterIndex >= chapters.length - 1}
          onPress={() => setChapterIndex((i) => i + 1)}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>下一章</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reader: { flex: 1, paddingHorizontal: 8, paddingTop: 12 },
  chapterTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, paddingHorizontal: 12 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navBtn: { padding: 10 },
  navText: { color: colors.primary, fontWeight: '600' },
  progress: { color: colors.muted },
});
