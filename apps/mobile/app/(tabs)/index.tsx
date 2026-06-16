import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BookDetailModal, type BookDetail } from '@/components/BookDetailModal';
import { CoverThumb } from '@/components/CoverThumb';
import { api, getToken } from '@/src/api';
import { deviceStorage, type DeviceShelfItem } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

type ShelfRow = DeviceShelfItem & {
  isCloud?: boolean;
  cloudBookId?: string;
  bookType?: string;
};

export default function ShelfScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShelfRow[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    setLoggedIn(!!token);
    const local = await deviceStorage.getShelf();
    let rows: ShelfRow[] = local.map((s) => ({ ...s }));

    if (token) {
      try {
        const cloud = await api.shelf();
        const cloudRows = cloud.map((item) => {
          const book = item.book as Record<string, unknown>;
          return {
            id: String(item.id),
            title: String(book.title),
            author: String(book.author),
            coverUrl: book.coverUrl ? String(book.coverUrl) : undefined,
            intro: book.intro ? String(book.intro) : undefined,
            sourceId: '',
            bookUrl: '',
            addedAt: item.createdAt ? String(item.createdAt) : '',
            isCloud: true,
            cloudBookId: String(book.id),
            bookType: book.bookType ? String(book.bookType) : undefined,
          } satisfies ShelfRow;
        });
        rows = [...cloudRows, ...rows];
      } catch {
        // 云端书架加载失败时仍显示本地
      }
    }
    setItems(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openDetail = async (item: ShelfRow) => {
    if (item.isCloud && item.cloudBookId) {
      setLoadingDetail(true);
      try {
        const data = await api.getBook(item.cloudBookId);
        setDetail({
          id: item.cloudBookId,
          title: String(data.title ?? item.title),
          author: String(data.author ?? item.author),
          intro: data.intro,
          coverUrl: data.coverUrl ?? item.coverUrl,
          bookType: data.bookType ?? item.bookType,
          publisher: data.publisher,
          language: data.language,
          chapterCount: data.chapterCount,
          createdAt: data.createdAt ?? item.addedAt,
          file: data.file,
        });
      } catch {
        setDetail({
          id: item.cloudBookId,
          title: item.title,
          author: item.author,
          coverUrl: item.coverUrl,
          intro: item.intro,
          bookType: item.bookType,
        });
      } finally {
        setLoadingDetail(false);
      }
      return;
    }

    setDetail({
      id: item.id,
      title: item.title,
      author: item.author,
      coverUrl: item.coverUrl,
      intro: item.intro,
      bookType: 'SOURCE',
      createdAt: item.addedAt,
    });
  };

  const startReading = () => {
    if (!detail) return;
    const item = items.find(
      (i) => i.cloudBookId === detail.id || i.id === detail.id,
    );
    setDetail(null);
    if (item?.isCloud && item.cloudBookId) {
      router.push(`/reader/cloud/${item.cloudBookId}`);
    } else if (item) {
      router.push(`/reader/local/${item.id}`);
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.hint}>
        {loggedIn ? '本地书架 + 云端书架' : '游客模式：书架保存在手机本地，登录后可同步云端'}
      </Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>书架为空，去搜索添加书籍吧</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openDetail(item)}>
            <CoverThumb coverUrl={item.coverUrl} title={item.title} />
            <View style={styles.cardBody}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.author} numberOfLines={1}>
                {item.author}
              </Text>
              <Text style={styles.badge}>{item.isCloud ? '云端' : '本机'}</Text>
            </View>
          </Pressable>
        )}
      />

      {loadingDetail && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      <BookDetailModal book={detail} onClose={() => setDetail(null)} onRead={startReading} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  hint: { padding: layout.pad, fontSize: 13, color: colors.muted, lineHeight: 20 },
  list: { padding: layout.pad, gap: 12, paddingTop: 0 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: layout.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  author: { fontSize: 14, color: colors.muted, marginTop: 4 },
  badge: { fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
