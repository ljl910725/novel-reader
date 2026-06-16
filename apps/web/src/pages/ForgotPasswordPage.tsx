import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.resetPassword({ email, code, newPassword });
      setHint(res.message);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md grid gap-4">
        <h1 className="text-2xl font-bold text-center">找回密码</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {hint && <p className="text-emerald-600 text-sm">{hint}</p>}

        {step === 'email' ? (
          <>
            <label>
              注册邮箱
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button
              type="button"
              onClick={sendCode}
              disabled={sending || countdown > 0}
              className="bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60"
            >
              {sending ? '发送中…' : '发送验证码'}
            </button>
          </>
        ) : (
          <form onSubmit={onReset} className="grid gap-4">
            <p className="text-sm text-slate-500">验证码已发送至 {email}</p>
            <label>
              验证码
              <div className="flex gap-2 mt-1">
                <input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} className="flex-1" />
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={sending || countdown > 0}
                  className="px-3 py-2 border rounded-lg text-sm whitespace-nowrap disabled:opacity-60"
                >
                  {countdown > 0 ? `${countdown}s` : '重发'}
                </button>
              </div>
            </label>
            <label>
              新密码
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <button type="submit" disabled={submitting} className="bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60">
              {submitting ? '提交中…' : '重置密码'}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link to="/" className="text-indigo-600">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
