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
import { api } from '@/src/api';
import { colors } from '@/src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
      const res = await api.forgotPassword(email);
      setHint(res.devCode ? `开发模式验证码：${res.devCode}` : res.message);
      setStep('reset');
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

  const reset = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await api.resetPassword({ email, code, newPassword });
      setHint(res.message);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '重置失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>找回密码</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {step === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="注册邮箱"
            placeholderTextColor={colors.muted}
          />
          <Pressable style={styles.btn} onPress={sendCode} disabled={sending || countdown > 0}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{countdown > 0 ? `${countdown}s` : '发送验证码'}</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sub}>验证码已发送至 {email}</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={code}
              onChangeText={setCode}
              placeholder="验证码"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={[styles.codeBtn, (sending || countdown > 0) && styles.disabled]}
              onPress={sendCode}
              disabled={sending || countdown > 0}
            >
              <Text style={styles.codeBtnText}>{countdown > 0 ? `${countdown}s` : '重发'}</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="新密码（至少 6 位）"
            placeholderTextColor={colors.muted}
          />
          <Pressable style={styles.btn} onPress={reset} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>重置密码</Text>}
          </Pressable>
        </>
      )}

      <Pressable onPress={() => router.replace('/login')}>
        <Text style={styles.link}>返回登录</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 14 },
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
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: colors.primary, fontWeight: '600', marginTop: 8 },
});
