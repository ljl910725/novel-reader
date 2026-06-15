import type { LegadoBookSource } from '@novel-reader/shared';
import { useState } from 'react';

interface SourceEditorProps {
  source: LegadoBookSource;
  onChange: (source: LegadoBookSource) => void;
  onExport?: () => void;
}

export function SourceEditor({ source, onChange, onExport }: SourceEditorProps) {
  const [tab, setTab] = useState<'search' | 'toc' | 'content'>('search');

  const updateRule = (section: 'ruleSearch' | 'ruleToc' | 'ruleContent', key: string, value: string) => {
    onChange({
      ...source,
      [section]: { ...source[section], [key]: value },
    });
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['search', 'toc', 'content'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: tab === t ? '2px solid #4f46e5' : '1px solid #ccc',
            }}
          >
            {t === 'search' ? '搜索规则' : t === 'toc' ? '目录规则' : '正文规则'}
          </button>
        ))}
        {onExport && (
          <button type="button" onClick={onExport} style={{ marginLeft: 'auto' }}>
            导出 Legado JSON
          </button>
        )}
      </div>

      <input
        value={source.bookSourceName}
        onChange={(e) => onChange({ ...source, bookSourceName: e.target.value })}
        placeholder="书源名称"
      />
      <input
        value={source.bookSourceUrl}
        onChange={(e) => onChange({ ...source, bookSourceUrl: e.target.value })}
        placeholder="书源 URL"
      />
      <input
        value={source.searchUrl}
        onChange={(e) => onChange({ ...source, searchUrl: e.target.value })}
        placeholder="searchUrl (含 {{key}})"
      />

      {tab === 'search' &&
        Object.entries(source.ruleSearch).map(([k, v]) => (
          <label key={k}>
            ruleSearch.{k}
            <input value={v} onChange={(e) => updateRule('ruleSearch', k, e.target.value)} />
          </label>
        ))}
      {tab === 'toc' &&
        Object.entries(source.ruleToc).map(([k, v]) => (
          <label key={k}>
            ruleToc.{k}
            <input value={v} onChange={(e) => updateRule('ruleToc', k, e.target.value)} />
          </label>
        ))}
      {tab === 'content' &&
        Object.entries(source.ruleContent).map(([k, v]) => (
          <label key={k}>
            ruleContent.{k}
            <input value={v} onChange={(e) => updateRule('ruleContent', k, e.target.value)} />
          </label>
        ))}
    </div>
  );
}
