import { describe, expect, it } from 'vitest';
import { parseRule, sanitizeHtml } from './parser';

describe('parseRule', () => {
  const html = `
    <div class="books">
      <div class="item"><a href="/book/1"><span class="title">斗破苍穹</span></a><span class="author">天蚕土豆</span></div>
      <div class="item"><a href="/book/2"><span class="title">完美世界</span></a></div>
    </div>
    <div id="content"><p>正文内容</p></div>
  `;

  it('extracts text with css selector', () => {
    expect(parseRule(html, '#content@text')).toBe('正文内容');
  });

  it('extracts multiple items', () => {
    const result = parseRule(html, '.item .title@text');
    expect(result).toEqual(['斗破苍穹', '完美世界']);
  });

  it('sanitizes html', () => {
    const dirty = '<p>ok</p><script>alert(1)</script>';
    expect(sanitizeHtml(dirty)).not.toContain('script');
  });
});
