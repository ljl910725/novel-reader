import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, setToken } from '@/src/api';
import { colors, layout } from '@/src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@novel.local');
  const [password, setPassword] = useState('demo123');

  const login = async () => {
    try {
      const { accessToken } = await api.login({ email, password });
      await setToken(accessToken);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '请检查网络与 API 地址');
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.logo}>NovelReader</Text>
      <Text style={styles.sub}>登录可同步云端书架；不登录也能用本机书源阅读</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="邮箱" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="密码" />
      <Pressable style={styles.btn} onPress={login}>
        <Text style={styles.btnText}>登录</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.guest}>游客继续（书源保存在手机）</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 12 },
  logo: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginBottom: 12, lineHeight: 20 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
  },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  guest: { textAlign: 'center', color: colors.primary, marginTop: 16, fontWeight: '600' },
});
