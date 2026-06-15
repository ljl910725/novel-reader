import { DEFAULT_READER_THEME, THEME_PRESETS, type ReaderTheme } from '@novel-reader/shared';

interface ThemePanelProps {
  theme: ReaderTheme;
  onChange: (theme: ReaderTheme) => void;
}

export function ThemePanel({ theme, onChange }: ThemePanelProps) {
  const update = (patch: Partial<ReaderTheme>) => onChange({ ...theme, ...patch });

  return (
    <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
      <h3 style={{ margin: 0 }}>阅读样式</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.keys(THEME_PRESETS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => update({ ...DEFAULT_READER_THEME, ...THEME_PRESETS[key] })}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: theme.preset === key ? '2px solid #4f46e5' : '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            {key === 'day' ? '日间' : key === 'night' ? '夜间' : key === 'sepia' ? '羊皮纸' : '护眼'}
          </button>
        ))}
      </div>
      <label>
        字号 {theme.fontSize}px
        <input
          type="range"
          min={12}
          max={32}
          value={theme.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        行高 {theme.lineHeight}
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={theme.lineHeight}
          onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        阅读宽度 {theme.contentWidth}px
        <input
          type="range"
          min={400}
          max={1200}
          value={theme.contentWidth}
          onChange={(e) => update({ contentWidth: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        背景色
        <input
          type="color"
          value={theme.backgroundColor}
          onChange={(e) => update({ backgroundColor: e.target.value, preset: 'custom' })}
        />
      </label>
      <label>
        文字色
        <input
          type="color"
          value={theme.textColor}
          onChange={(e) => update({ textColor: e.target.value, preset: 'custom' })}
        />
      </label>
    </div>
  );
}
