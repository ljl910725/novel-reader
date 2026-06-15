import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, getToken, setToken } from '@/src/api';
import { deviceStorage } from '@/src/lib/deviceStorage';
import { colors, layout } from '@/src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState('http://10.0.2.2:3001/api');
  const [email, setEmail] = useState('demo@novel.local');
  const [password, setPassword] = useState('demo123');
  const [nickname, setNickname] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      setApiUrl(await deviceStorage.getApiUrl());
      const token = await getToken();
      if (token) {
        try {
          const me = await api.me();
          setNickname(me.nickname);
          setLoggedIn(true);
        } catch {
          await setToken(null);
        }
      }
    })();
  }, []);

  const saveApi = async () => {
    await deviceStorage.setApiUrl(apiUrl);
    Alert.alert('已保存', 'API 地址已写入手机本地');
  };

  const login = async () => {
    try {
      const { accessToken } = await api.login({ email, password });
      await setToken(accessToken);
      const me = await api.me();
      setNickname(me.nickname);
      setLoggedIn(true);
      Alert.alert('登录成功', `欢迎，${me.nickname}`);
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '请检查账号和 API 地址');
    }
  };

  const logout = async () => {
    await setToken(null);
    setLoggedIn(false);
    setNickname('');
  };

  return (
    <View style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>服务器地址</Text>
        <Text style={styles.hint}>真机请填电脑局域网 IP，如 http://192.168.1.10:3001/api</Text>
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
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="密码"
              secureTextEntry
            />
            <Pressable style={styles.btn} onPress={login}>
              <Text style={styles.btnText}>登录同步云端</Text>
            </Pressable>
          </>
        )}
        {loggedIn && (
          <Pressable style={styles.outlineBtn} onPress={logout}>
            <Text style={styles.outlineText}>退出登录</Text>
          </Pressable>
        )}
      </View>

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
  btn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  outlineText: { color: colors.text },
  link: { textAlign: 'center', color: colors.primary },
});
