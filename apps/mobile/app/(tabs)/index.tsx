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
  progress?: {
    chapterIndex?: number;
    percent?: number;
    chapterTitle?: string | null;
    updatedAt?: string | null;
  } | null;
};

export default function ShelfScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShelfRow[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sort, setSort] = useState<'recentRead' | 'added' | 'name'>('recentRead');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    setLoggedIn(!!token);
    const local = await deviceStorage.getShelf();
    const localProgressMap = new Map(
      (
        await Promise.all(
          local.map(async (s) => [s.id, await deviceStorage.getProgress(s.id)] as const),
        )
      ).filter(Boolean),
    );
    let rows: ShelfRow[] = local.map((s) => ({
      ...s,
      progress: localProgressMap.get(s.id) ?? null,
    }));

    if (token) {
      try {
        const cloud = await api.shelfSorted(sort);
        const cloudRows = cloud.map((item) => {
          const book = item.book as Record<string, unknown>;
          const progress = item.progress as any;
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
            progress: progress
              ? {
                  chapterIndex: Number(progress.chapterIndex ?? 0),
                  percent: typeof progress.percent === 'number' ? Number(progress.percent) : undefined,
                  chapterTitle: progress.chapter?.title ? String(progress.chapter.title) : null,
                  updatedAt: progress.updatedAt ? String(progress.updatedAt) : null,
                }
              : null,
          } satisfies ShelfRow;
        });
        rows = [...cloudRows, ...rows];
      } catch {
        // 云端书架加载失败时仍显示本地
      }
    }

    const sorted = [...rows];
    if (sort === 'name') {
      sorted.sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh-Hans-CN'));
    } else if (sort === 'added') {
      sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    } else {
      sorted.sort((a, b) => {
        const at = a.progress?.updatedAt ? new Date(String(a.progress.updatedAt)).getTime() : 0;
        const bt = b.progress?.updatedAt ? new Date(String(b.progress.updatedAt)).getTime() : 0;
        if (at !== bt) return bt - at;
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      });
    }
    setItems(sorted);
  }, [sort]);

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

  const startReading = (item: ShelfRow) => {
    setDetail(null);
    if (item.isCloud && item.cloudBookId) {
      router.push(`/reader/cloud/${item.cloudBookId}`);
    } else {
      router.push(`/reader/local/${item.id}`);
    }
  };

  const removeItem = async (item: ShelfRow) => {
    if (item.isCloud && item.cloudBookId) {
      await api.removeFromShelf(item.cloudBookId);
    } else {
      await deviceStorage.removeFromShelf(item.id);
    }
    setMenuOpenId(null);
    load();
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
          <Pressable style={styles.card} onPress={() => startReading(item)}>
            <CoverThumb coverUrl={item.coverUrl} title={item.title} />
            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Pressable
                  style={styles.menuBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    setMenuOpenId((prev) => (prev === item.id ? null : item.id));
                  }}
                >
                  <Text style={styles.menuText}>⋯</Text>
                </Pressable>
              </View>
              <Text style={styles.author} numberOfLines={1}>
                {item.author}
              </Text>
              {item.progress && (item.progress.chapterTitle || item.progress.chapterIndex != null) ? (
                <Text style={styles.progressLine} numberOfLines={1}>
                  {(item.progress.chapterTitle ??
                    `第 ${(Number(item.progress.chapterIndex ?? 0) + 1).toString()} 章`) +
                    (typeof item.progress.percent === 'number'
                      ? ` · ${Math.round(item.progress.percent)}%`
                      : '')}
                </Text>
              ) : (
                <Text style={styles.badge}>{item.isCloud ? '云端' : '本机'}</Text>
              )}
            </View>

            {menuOpenId === item.id && (
              <View style={styles.menu}>
                <Pressable
                  style={styles.menuItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    openDetail(item).finally(() => setMenuOpenId(null));
                  }}
                >
                  <Text style={styles.menuItemText}>查看详情</Text>
                </Pressable>
                <View style={styles.menuSep} />
                <Pressable
                  style={styles.menuItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSort('recentRead');
                    setMenuOpenId(null);
                  }}
                >
                  <Text style={styles.menuItemText}>排序：按最近阅读</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSort('added');
                    setMenuOpenId(null);
                  }}
                >
                  <Text style={styles.menuItemText}>排序：按添加时间</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSort('name');
                    setMenuOpenId(null);
                  }}
                >
                  <Text style={styles.menuItemText}>排序：按书名</Text>
                </Pressable>
                <View style={styles.menuSep} />
                <Pressable
                  style={styles.menuItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeItem(item).catch(() => {});
                  }}
                >
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>删除</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}
      />

      {loadingDetail && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      <BookDetailModal
        book={detail}
        onClose={() => setDetail(null)}
        onRead={() => {
          const item = detail
            ? items.find((i) => i.cloudBookId === detail.id || i.id === detail.id)
            : null;
          if (item) startReading(item);
        }}
      />
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
    position: 'relative',
  },
  cardBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  menuBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  menuText: { color: colors.muted, fontSize: 22, lineHeight: 22 },
  author: { fontSize: 14, color: colors.muted, marginTop: 4 },
  badge: { fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: '600' },
  progressLine: { fontSize: 12, color: colors.muted, marginTop: 8 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    right: 10,
    top: 46,
    width: 200,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.radius,
    overflow: 'hidden',
    zIndex: 20,
  },
  menuItem: { paddingHorizontal: 12, paddingVertical: 10 },
  menuItemText: { fontSize: 14, color: colors.text },
  menuSep: { height: 1, backgroundColor: colors.border },
});
