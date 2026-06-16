import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'react-native';
import { colors, layout } from '@/src/theme';

export type BookDetail = {
  id: string;
  title: string;
  author: string;
  intro?: string | null;
  coverUrl?: string | null;
  bookType?: string;
  publisher?: string;
  language?: string;
  chapterCount?: number;
  createdAt?: string;
  file?: {
    filename: string;
    format: string;
    fileSize: number;
    uploadedAt: string;
  };
  badge?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN');
}

function bookTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    SOURCE: '在线书源',
    LOCAL_TXT: '本地 TXT',
    LOCAL_EPUB: '本地 EPUB',
    SERVER_TXT: '云端 TXT',
    SERVER_EPUB: '云端 EPUB',
  };
  return type ? (map[type] ?? type) : '—';
}

interface Props {
  book: BookDetail | null;
  onClose: () => void;
  onRead: () => void;
}

export function BookDetailModal({ book, onClose, onRead }: Props) {
  if (!book) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              {book.coverUrl ? (
                <Image source={{ uri: book.coverUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={styles.coverPlaceholderText}>无封面</Text>
                </View>
              )}
              <View style={styles.meta}>
                <Text style={styles.title}>{book.title}</Text>
                <Text style={styles.author}>{book.author}</Text>
                <Text style={styles.type}>
                  {book.badge ?? bookTypeLabel(book.bookType)}
                </Text>
              </View>
            </View>

            {book.intro ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>简介</Text>
                <Text style={styles.intro}>{book.intro}</Text>
              </View>
            ) : null}

            {book.publisher ? (
              <Text style={styles.row}>出版社：{book.publisher}</Text>
            ) : null}
            {book.language ? (
              <Text style={styles.row}>语言：{book.language}</Text>
            ) : null}
            {book.chapterCount != null ? (
              <Text style={styles.row}>章节数：{book.chapterCount}</Text>
            ) : null}
            {book.file ? (
              <>
                <Text style={styles.row}>格式：{book.file.format}</Text>
                <Text style={styles.row}>大小：{formatBytes(book.file.fileSize)}</Text>
                <Text style={styles.row}>上传：{formatDate(book.file.uploadedAt)}</Text>
              </>
            ) : book.createdAt ? (
              <Text style={styles.row}>加入时间：{formatDate(book.createdAt)}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.outlineBtn} onPress={onClose}>
              <Text style={styles.outlineText}>关闭</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={onRead}>
              <Text style={styles.primaryText}>开始阅读</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: layout.pad,
  },
  header: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  cover: { width: 88, height: 124, borderRadius: 8, backgroundColor: colors.border },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderText: { color: colors.muted, fontSize: 12 },
  meta: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  author: { fontSize: 14, color: colors.muted, marginTop: 4 },
  type: { fontSize: 12, color: colors.muted, marginTop: 8 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  row: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 12 },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  outlineText: { color: colors.text, fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
});
