import { DEFAULT_READER_THEME } from '@novel-reader/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, getToken } from '@/src/api';
import { deviceStorage, type DeviceShelfItem } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

type ShelfRow = DeviceShelfItem & { isCloud?: boolean; cloudBookId?: string };

export default function ShelfScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShelfRow[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

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
            sourceId: '',
            bookUrl: '',
            addedAt: '',
            isCloud: true,
            cloudBookId: String(book.id),
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
          <Pressable
            style={styles.card}
            onPress={() => {
              if (item.isCloud && item.cloudBookId) {
                router.push(`/reader/cloud/${item.cloudBookId}`);
              } else {
                router.push(`/reader/local/${item.id}`);
              }
            }}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.badge}>{item.isCloud ? '云端' : '本机'}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  hint: { padding: layout.pad, fontSize: 13, color: colors.muted, lineHeight: 20 },
  list: { padding: layout.pad, gap: 12, paddingTop: 0 },
  card: {
    backgroundColor: colors.card,
    borderRadius: layout.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  author: { fontSize: 14, color: colors.muted, marginTop: 4 },
  badge: { fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
