import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(email, password, nickname, code);
      navigate('/shelf', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md grid gap-4">
        <h1 className="text-2xl font-bold text-center">注册账号</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {hint && <p className="text-emerald-600 text-sm">{hint}</p>}
        <label>
          昵称
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        </label>
        <label>
          邮箱
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          邮箱验证码
          <div className="flex gap-2 mt-1">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              placeholder="6 位数字"
              className="flex-1"
            />
            <button
              type="button"
              onClick={sendCode}
              disabled={sending || countdown > 0}
              className="px-3 py-2 border rounded-lg text-sm whitespace-nowrap disabled:opacity-60"
            >
              {countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '获取验证码'}
            </button>
          </div>
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60"
        >
          {submitting ? '注册中…' : '注册'}
        </button>
        <p className="text-center text-sm">
          <Link to="/" className="text-indigo-600">
            已有账号，去登录
          </Link>
        </p>
      </form>
    </div>
  );
}
