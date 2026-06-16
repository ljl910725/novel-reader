import type { ReaderTheme } from '@novel-reader/shared';

export function isHtmlContent(content: string): boolean {
  return content.includes('<') && content.includes('>');
}

export function plainTextFromContent(content: string): string {
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, '\n')
    .trim();
}

export function htmlDocument(content: string, theme: ReaderTheme): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  body {
    margin: 0;
    padding: 16px;
    background: ${theme.backgroundColor};
    color: ${theme.textColor};
    font-size: ${theme.fontSize}px;
    line-height: ${theme.lineHeight};
    font-family: ${theme.fontFamily}, system-ui, sans-serif;
    word-wrap: break-word;
  }
  img { max-width: 100%; height: auto; display: block; margin: 12px auto; }
  p { margin: 0 0 ${theme.paragraphSpacing}px; }
</style>
</head>
<body>${content}</body>
</html>`;
}
