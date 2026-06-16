import { describe, expect, it } from 'vitest';
import { isHtmlContent, plainTextFromContent } from './readerContent';

describe('readerContent', () => {
  it('detects HTML content', () => {
    expect(isHtmlContent('<p>hello</p>')).toBe(true);
    expect(isHtmlContent('plain text')).toBe(false);
  });

  it('strips tags to plain text', () => {
    expect(plainTextFromContent('<p>line1</p><p>line2</p>')).toContain('line1');
    expect(plainTextFromContent('<p>line1</p><p>line2</p>')).toContain('line2');
  });
});
