import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, nickname);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md grid gap-4">
        <h1 className="text-2xl font-bold text-center">注册账号</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <label>昵称<input value={nickname} onChange={(e) => setNickname(e.target.value)} required /></label>
        <label>邮箱<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></label>
        <button type="submit" className="bg-indigo-600 text-white py-2 rounded-lg">注册</button>
        <p className="text-center text-sm"><Link to="/" className="text-indigo-600">已有账号，去登录</Link></p>
      </form>
    </div>
  );
}
