import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { UserPermissions } from '@novel-reader/shared';
import { api, clearTokens, getToken, setTokens, type UploadedFileRecord } from '@/src/api';
import { deviceStorage } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

const REMEMBER_OPTIONS = [
  { value: 1 as const, label: '1 天' },
  { value: 7 as const, label: '7 天' },
  { value: 30 as const, label: '30 天' },
];

const STATUS_LABEL: Record<UploadedFileRecord['parseStatus'], string> = {
  PENDING: '等待中',
  PARSING: '解析中',
  DONE: '已完成',
  FAILED: '失败',
};

const DEFAULT_API =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://10.0.2.2:3001/api';

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(DEFAULT_API);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [rememberDays, setRememberDays] = useState<1 | 7 | 30>(7);
  const [nickname, setNickname] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [history, setHistory] = useState<UploadedFileRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const historyRef = useRef(history);
  historyRef.current = history;

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoggedIn(false);
      setNickname('');
      setPermissions(null);
      setHistory([]);
      return;
    }
    try {
      const me = await api.me();
      setNickname(me.nickname);
      setPermissions(me.permissions);
      setLoggedIn(true);
    } catch {
      await clearTokens();
      setLoggedIn(false);
      setNickname('');
      setPermissions(null);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!loggedIn || !permissions?.cloudUpload) return;
    setHistoryLoading(true);
    try {
      setHistory(await api.listFiles());
    } catch (e) {
      Alert.alert('加载失败', e instanceof Error ? e.message : '无法加载上传记录');
    } finally {
      setHistoryLoading(false);
    }
  }, [loggedIn, permissions?.cloudUpload]);

  useEffect(() => {
    (async () => {
      setApiUrl(await deviceStorage.getApiUrl());
      await refreshUser();
    })();
  }, [refreshUser]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!loggedIn || !permissions?.cloudUpload) return;
    const interval = setInterval(async () => {
      const pending = historyRef.current.filter(
        (f) => f.parseStatus === 'PARSING' || f.parseStatus === 'PENDING',
      );
      if (pending.length === 0) return;
      try {
        const updates = await Promise.all(pending.map((f) => api.fileStatus(f.id)));
        setHistory((prev) => {
          const map = new Map(updates.map((u) => [u.id, u]));
          return prev.map((item) => map.get(item.id) ?? item);
        });
      } catch {
        // ignore poll errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [loggedIn, permissions?.cloudUpload]);

  const saveApi = async () => {
    await deviceStorage.setApiUrl(apiUrl);
    Alert.alert('已保存', 'API 地址已写入手机本地');
  };

  const login = async () => {
    try {
      const days: 0 | 1 | 7 | 30 = remember ? rememberDays : 0;
      const tokens = await api.login({ email, password, rememberDays: days });
      await setTokens(tokens.accessToken, tokens.refreshToken, days > 0 ? days : undefined);
      const me = await api.me();
      setNickname(me.nickname);
      setPermissions(me.permissions);
      setLoggedIn(true);
      Alert.alert('登录成功', `欢迎，${me.nickname}`);
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '请检查账号和 API 地址');
    }
  };

  const logout = async () => {
    await clearTokens();
    setLoggedIn(false);
    setNickname('');
    setPermissions(null);
    setHistory([]);
  };

  const pickAndUpload = async () => {
    if (!permissions?.cloudUpload) {
      Alert.alert('无权限', '当前账号无云端上传权限');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'application/epub+zip'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await api.uploadFile(asset.uri, asset.name, asset.mimeType ?? 'text/plain');
      await loadHistory();
      Alert.alert('上传成功', '文件已提交解析');
    } catch (e) {
      Alert.alert('上传失败', e instanceof Error ? e.message : '请检查网络');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>服务器地址</Text>
        <Text style={styles.hint}>
          模拟器默认 10.0.2.2；真机填局域网 IP。Docker 部署可用 http://192.168.x.x:8811/api
        </Text>
        <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
        <Pressable style={styles.btn} onPress={saveApi}>
          <Text style={styles.btnText}>保存到手机</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{loggedIn ? `已登录：${nickname}` : '登录（可选）'}</Text>
        <Text style={styles.hint}>不登录也能用：书源、书架、进度均保存在手机本地</Text>
        {!loggedIn && (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="邮箱"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="密码"
              placeholderTextColor={colors.muted}
              secureTextEntry
            />
            <View style={styles.rememberRow}>
              <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.primary }} />
              <Text style={styles.rememberLabel}>保持登录</Text>
              {remember &&
                REMEMBER_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.dayBtn, rememberDays === opt.value && styles.dayBtnActive]}
                    onPress={() => setRememberDays(opt.value)}
                  >
                    <Text style={[styles.dayText, rememberDays === opt.value && styles.dayTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
            </View>
            <Pressable style={styles.btn} onPress={login}>
              <Text style={styles.btnText}>登录同步云端</Text>
            </Pressable>
            <View style={styles.links}>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.link}>注册</Text>
              </Pressable>
              <Text style={styles.dot}>·</Text>
              <Pressable onPress={() => router.push('/forgot-password')}>
                <Text style={styles.link}>忘记密码</Text>
              </Pressable>
            </View>
          </>
        )}
        {loggedIn && (
          <Pressable style={styles.outlineBtn} onPress={logout}>
            <Text style={styles.outlineText}>退出登录</Text>
          </Pressable>
        )}
      </View>

      {loggedIn && permissions?.cloudUpload && (
        <View style={styles.section}>
          <Text style={styles.title}>云端上传</Text>
          <Pressable style={styles.btn} onPress={pickAndUpload} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>选择 TXT/EPUB 上传</Text>
            )}
          </Pressable>
          {historyLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.hint}>暂无上传记录</Text>}
              renderItem={({ item }) => (
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName} numberOfLines={1}>
                      {item.filename}
                    </Text>
                    <Text style={styles.hint}>
                      {STATUS_LABEL[item.parseStatus]}
                      {item.book ? ` · ${item.book.title}` : ''}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      <Pressable onPress={() => router.push('/login')}>
        <Text style={styles.link}>全屏登录页</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: layout.pad, gap: 16 },
  section: {
    backgroundColor: colors.card,
    borderRadius: layout.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rememberLabel: { color: colors.text, fontSize: 14 },
  dayBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.text, fontSize: 12 },
  dayTextActive: { color: '#fff' },
  btn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  outlineText: { color: colors.text },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  link: { textAlign: 'center', color: colors.primary, fontWeight: '600' },
  dot: { color: colors.muted },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyName: { fontSize: 14, color: colors.text, fontWeight: '500' },
});
