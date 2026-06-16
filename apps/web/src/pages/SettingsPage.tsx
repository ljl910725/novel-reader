import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

interface Props {
  user: { id: string; email: string; nickname: string } | null;
}

export function SettingsPage({ user }: Props) {
  const { refresh } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [emailCountdown, setEmailCountdown] = useState(0);

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user?.nickname]);

  const sendEmailCode = async () => {
    if (!newEmail) {
      setError('请填写新邮箱');
      return;
    }
    setError('');
    try {
      const res = await api.sendChangeEmailCode(newEmail);
      setMsg(res.devCode ? `开发模式验证码：${res.devCode}` : res.message);
      setEmailCountdown(60);
      const timer = setInterval(() => {
        setEmailCountdown((n) => {
          if (n <= 1) {
            clearInterval(timer);
            return 0;
          }
          return n - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.updateProfile(nickname);
      await refresh();
      setMsg('昵称已更新');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.changeEmail({ newEmail, code: emailCode });
      await refresh();
      setMsg('邮箱已更新');
      setNewEmail('');
      setEmailCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '更换失败');
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '修改失败');
    }
  };

  return (
    <div className="max-w-2xl grid gap-8">
      <h1 className="text-2xl font-bold">设置</h1>
      {msg && <p className="text-indigo-600">{msg}</p>}
      {error && <p className="text-red-600">{error}</p>}

      {user ? (
        <>
          <section className="bg-white border rounded-xl p-6 grid gap-4">
            <h2 className="font-semibold">账户资料</h2>
            <p className="text-sm text-slate-500">当前邮箱：{user.email}</p>
            <form onSubmit={saveProfile} className="grid gap-3">
              <label>
                昵称
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
              </label>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg w-fit">
                保存昵称
              </button>
            </form>
          </section>

          <section className="bg-white border rounded-xl p-6 grid gap-4">
            <h2 className="font-semibold">更换邮箱</h2>
            <form onSubmit={saveEmail} className="grid gap-3">
              <label>
                新邮箱
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </label>
              <label>
                验证码
                <div className="flex gap-2 mt-1">
                  <input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} maxLength={6} className="flex-1" />
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={emailCountdown > 0}
                    className="px-3 py-2 border rounded-lg text-sm disabled:opacity-60"
                  >
                    {emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码'}
                  </button>
                </div>
              </label>
              <button type="submit" className="px-4 py-2 border rounded-lg w-fit">
                确认更换邮箱
              </button>
            </form>
          </section>

          <section className="bg-white border rounded-xl p-6 grid gap-4">
            <h2 className="font-semibold">修改密码</h2>
            <form onSubmit={savePassword} className="grid gap-3">
              <label>
                当前密码
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </label>
              <label>
                新密码
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </label>
              <button type="submit" className="px-4 py-2 border rounded-lg w-fit">
                修改密码
              </button>
            </form>
            <p className="text-sm">
              忘记密码？<Link to="/forgot-password" className="text-indigo-600">通过邮箱找回</Link>
            </p>
          </section>
        </>
      ) : (
        <p className="text-slate-600">
          游客模式无需账户设置。<Link to="/login" className="text-indigo-600">登录</Link> 后可管理资料与密码。
        </p>
      )}

      <section className="bg-white border rounded-xl p-6 grid gap-4">
        <h2 className="font-semibold">书源获取三步走</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-700">
          <li><strong>书源商店</strong>：侧边栏进入，一键导入演示书源（推荐新手）</li>
          <li><strong>生成书源向导</strong>：输入小说站网址，分步自动分析规则</li>
          <li><strong>社区导入</strong>：在「我的书源」粘贴 JSON 或订阅链接</li>
        </ol>
      </section>
    </div>
  );
}
