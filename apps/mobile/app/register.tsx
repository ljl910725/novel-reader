import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, setTokens } from '@/src/api';
import { colors } from '@/src/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendCode = async () => {
    if (!email) {
      setError('请先填写邮箱');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await api.sendRegisterCode(email);
      setHint(res.devCode ? `开发模式验证码：${res.devCode}` : res.message);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((n) => {
          if (n <= 1) {
            clearInterval(timer);
            return 0;
          }
          return n - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const register = async () => {
    setError('');
    setSubmitting(true);
    try {
      const tokens = await api.register({ email, password, nickname, code });
      await setTokens(tokens.accessToken, tokens.refreshToken, 7);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>注册账号</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="昵称"
        placeholderTextColor={colors.muted}
      />
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="邮箱"
        placeholderTextColor={colors.muted}
      />
      <View style={styles.codeRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={code}
          onChangeText={setCode}
          placeholder="6 位验证码"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Pressable
          style={[styles.codeBtn, (sending || countdown > 0) && styles.disabled]}
          onPress={sendCode}
          disabled={sending || countdown > 0}
        >
          <Text style={styles.codeBtnText}>
            {countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码'}
          </Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="密码（至少 6 位）"
        placeholderTextColor={colors.muted}
      />
      <Pressable style={styles.btn} onPress={register} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>注册</Text>}
      </Pressable>
      <Pressable onPress={() => router.replace('/login')}>
        <Text style={styles.link}>已有账号，去登录</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  error: { color: colors.danger, textAlign: 'center', fontSize: 14 },
  hint: { color: colors.success, textAlign: 'center', fontSize: 14 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
  },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  codeBtnText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: colors.primary, fontWeight: '600', marginTop: 8 },
});
