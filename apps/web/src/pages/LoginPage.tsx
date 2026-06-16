import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@novel.local');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/shelf', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md grid gap-4">
        <h1 className="text-2xl font-bold text-center">NovelReader 登录</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <label>
          邮箱
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-60"
        >
          {submitting ? '登录中…' : '登录'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/shelf')}
          className="border border-slate-300 py-2 rounded-lg text-slate-700"
        >
          游客继续使用（无需登录）
        </button>
        <p className="text-center text-sm">
          没有账号？<Link to="/register" className="text-indigo-600">注册</Link>
        </p>
        <p className="text-xs text-slate-500 text-center">演示账号：demo@novel.local / demo123</p>
      </form>
    </div>
  );
}
