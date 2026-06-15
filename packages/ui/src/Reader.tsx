import type { ReaderTheme } from '@novel-reader/shared';
import type { ReactNode } from 'react';

interface ReaderProps {
  theme: ReaderTheme;
  title: string;
  content: string;
  isHtml?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  toolbar?: ReactNode;
}

export function Reader({ theme, title, content, isHtml, onPrev, onNext, toolbar }: ReaderProps) {
  const style: React.CSSProperties = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontSize: theme.fontSize,
    lineHeight: theme.lineHeight,
    fontFamily: theme.fontFamily,
    minHeight: '100%',
    padding: '24px',
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: theme.contentWidth,
    margin: '0 auto',
  };

  const paragraphStyle = { marginBottom: theme.paragraphSpacing };

  return (
    <div style={style} className="reader-root">
      {toolbar}
      <div style={innerStyle}>
        <h1 style={{ fontSize: theme.fontSize + 4, marginBottom: 16 }}>{title}</h1>
        {isHtml ? (
          <div
            style={paragraphStyle}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          content.split('\n').map((p, i) =>
            p.trim() ? (
              <p key={i} style={paragraphStyle}>
                {p}
              </p>
            ) : null,
          )
        )}
      </div>
      <div style={{ ...innerStyle, display: 'flex', gap: 12, marginTop: 24 }}>
        {onPrev && (
          <button type="button" onClick={onPrev} style={btnStyle(theme)}>
            上一章
          </button>
        )}
        {onNext && (
          <button type="button" onClick={onNext} style={btnStyle(theme)}>
            下一章
          </button>
        )}
      </div>
    </div>
  );
}

function btnStyle(theme: ReaderTheme): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 6,
    border: `1px solid ${theme.textColor}33`,
    background: 'transparent',
    color: theme.textColor,
    cursor: 'pointer',
  };
}
