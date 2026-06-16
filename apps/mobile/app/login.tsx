import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, setTokens } from '@/src/api';
import { colors } from '@/src/theme';

const REMEMBER_OPTIONS = [
  { value: 1 as const, label: '1 天' },
  { value: 7 as const, label: '7 天' },
  { value: 30 as const, label: '30 天' },
];

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [rememberDays, setRememberDays] = useState<1 | 7 | 30>(7);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const login = async () => {
    setError('');
    setSubmitting(true);
    try {
      const days: 0 | 1 | 7 | 30 = remember ? rememberDays : 0;
      const tokens = await api.login({ email, password, rememberDays: days });
      await setTokens(tokens.accessToken, tokens.refreshToken, days > 0 ? days : undefined);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '请检查网络与 API 地址');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.logo}>NovelReader</Text>
      <Text style={styles.sub}>登录可同步云端书架；不登录也能用本机书源阅读</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="邮箱"
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="密码"
        placeholderTextColor={colors.muted}
      />
      <View style={styles.rememberRow}>
        <View style={styles.rememberToggle}>
          <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.primary }} />
          <Text style={styles.rememberLabel}>保持登录</Text>
        </View>
        {remember && (
          <View style={styles.daysRow}>
            {REMEMBER_OPTIONS.map((opt) => (
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
        )}
      </View>
      <Pressable style={styles.btn} onPress={login} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>登录</Text>
        )}
      </Pressable>
      <Pressable style={styles.outlineBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.outlineText}>游客继续（书源保存在手机）</Text>
      </Pressable>
      <View style={styles.links}>
        <Pressable onPress={() => router.push('/register')}>
          <Text style={styles.link}>注册账号</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable onPress={() => router.push('/forgot-password')}>
          <Text style={styles.link}>忘记密码</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 12 },
  logo: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginBottom: 4, lineHeight: 20 },
  error: { color: colors.danger, textAlign: 'center', fontSize: 14 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
  },
  rememberRow: { gap: 8 },
  rememberToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberLabel: { color: colors.text, fontSize: 14 },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.text, fontSize: 13 },
  dayTextActive: { color: '#fff' },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  outlineText: { color: colors.text, fontWeight: '600' },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 },
  link: { color: colors.primary, fontWeight: '600' },
  dot: { color: colors.muted },
});
