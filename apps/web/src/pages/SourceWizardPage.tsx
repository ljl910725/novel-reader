import { useState } from 'react';
import type { LegadoBookSource } from '@novel-reader/shared';
import { api } from '../api';
import { guestStorage } from '../lib/guestStorage';

interface Props {
  user: { id: string } | null;
}

export function SourceWizardPage({ user }: Props) {
  const [step, setStep] = useState(1);
  const [siteUrl, setSiteUrl] = useState('');
  const [searchUrl, setSearchUrl] = useState('');
  const [keyword, setKeyword] = useState('斗破');
  const [tocUrl, setTocUrl] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [name, setName] = useState('我的书源');
  const [ruleSearch, setRuleSearch] = useState<Record<string, string>>({});
  const [ruleToc, setRuleToc] = useState<Record<string, string>>({});
  const [ruleContent, setRuleContent] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<unknown[]>([]);
  const [msg, setMsg] = useState('');

  const probe = async () => {
    const r = await api.wizardProbe(siteUrl) as { suggestedSearchUrl?: string; message: string };
    if (r.suggestedSearchUrl) setSearchUrl(r.suggestedSearchUrl);
    setMsg(r.message);
    setStep(2);
  };

  const analyzeSearch = async () => {
    const r = await api.wizardAnalyzeSearch({ siteUrl, searchUrl, keyword }) as { rules: Record<string, string>; preview: unknown[]; message: string };
    setRuleSearch(r.rules);
    setPreview(r.preview);
    setMsg(r.message);
    setStep(3);
  };

  const analyzeToc = async () => {
    const r = await api.wizardAnalyzeToc(tocUrl) as { rules: Record<string, string>; preview: unknown[]; message: string };
    setRuleToc(r.rules);
    setPreview(r.preview);
    setMsg(r.message);
    setStep(4);
  };

  const analyzeContent = async () => {
    const r = await api.wizardAnalyzeContent(contentUrl) as { rules: Record<string, string>; preview: unknown[]; message: string };
    setRuleContent(r.rules);
    setPreview(r.preview);
    setMsg(r.message);
  };

  const save = async () => {
    const config = {
      bookSourceUrl: siteUrl,
      bookSourceName: name,
      searchUrl,
      ruleSearch,
      ruleToc,
      ruleContent,
    } as LegadoBookSource;
    if (user) {
      await api.wizardSave({ siteUrl, name, searchUrl, ruleSearch, ruleToc, ruleContent });
    } else {
      guestStorage.importSources([config]);
    }
    setMsg(user ? '书源已保存到云端！' : '书源已保存到本机！登录后可同步');
  };

  return (
    <div className="max-w-2xl grid gap-6">
      <h1 className="text-2xl font-bold">书源生成向导</h1>
      <p className="text-slate-600">输入小说网站地址，分步自动生成 Legado 书源规则</p>
      {msg && <p className="text-indigo-600">{msg}</p>}

      {step === 1 && (
        <section className="bg-white border rounded-xl p-4 grid gap-3">
          <h2>步骤 1：探测站点</h2>
          <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://某小说站.com" />
          <button type="button" onClick={probe} className="px-4 py-2 bg-indigo-600 text-white rounded-lg w-fit">探测</button>
        </section>
      )}

      {step >= 2 && (
        <section className="bg-white border rounded-xl p-4 grid gap-3">
          <h2>步骤 2：分析搜索页</h2>
          <input value={searchUrl} onChange={(e) => setSearchUrl(e.target.value)} placeholder="searchUrl" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="测试关键词" />
          <button type="button" onClick={analyzeSearch} className="px-4 py-2 bg-indigo-600 text-white rounded-lg w-fit">分析搜索</button>
        </section>
      )}

      {step >= 3 && (
        <section className="bg-white border rounded-xl p-4 grid gap-3">
          <h2>步骤 3：分析目录页</h2>
          <input value={tocUrl} onChange={(e) => setTocUrl(e.target.value)} placeholder="粘贴目录页链接" />
          <button type="button" onClick={analyzeToc} className="px-4 py-2 bg-indigo-600 text-white rounded-lg w-fit">分析目录</button>
        </section>
      )}

      {step >= 4 && (
        <section className="bg-white border rounded-xl p-4 grid gap-3">
          <h2>步骤 4：分析正文页</h2>
          <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="粘贴章节正文链接" />
          <button type="button" onClick={analyzeContent} className="px-4 py-2 bg-indigo-600 text-white rounded-lg w-fit">分析正文</button>
        </section>
      )}

      {Object.keys(ruleSearch).length > 0 && (
        <section className="bg-white border rounded-xl p-4 grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="书源名称" />
          <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto">{JSON.stringify({ ruleSearch, ruleToc, ruleContent }, null, 2)}</pre>
          {preview.length > 0 && <pre className="text-xs bg-green-50 p-3 rounded">{JSON.stringify(preview, null, 2)}</pre>}
          <button type="button" onClick={save} className="px-4 py-2 bg-green-600 text-white rounded-lg w-fit">保存为书源</button>
        </section>
      )}
    </div>
  );
}
