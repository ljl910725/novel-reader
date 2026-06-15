import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Props {
  user: { onboardingDone: boolean };
}

export function OnboardingModal({ user }: Props) {
  const [open, setOpen] = useState(!user.onboardingDone);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  if (!open) return null;

  const steps = [
    { title: '第一步：导入书源', desc: '前往书源商店，一键导入演示书源', action: () => navigate('/source-store') },
    { title: '第二步：搜索小说', desc: '在搜索页输入书名试试', action: () => navigate('/search') },
    { title: '第三步：加入书架', desc: '找到喜欢的书后点击加入书架', action: () => navigate('/search') },
  ];

  const finish = async () => {
    await api.completeOnboarding();
    setOpen(false);
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-2">欢迎使用 NovelReader</h2>
        <p className="text-slate-600 mb-4">{current.title}</p>
        <p className="mb-6">{current.desc}</p>
        <div className="flex gap-2 justify-between">
          <button type="button" onClick={finish} className="text-slate-500">
            跳过
          </button>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <>
                <button type="button" onClick={current.action} className="px-4 py-2 border rounded-lg">
                  前往
                </button>
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  下一步
                </button>
              </>
            ) : (
              <button type="button" onClick={finish} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                开始使用
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
