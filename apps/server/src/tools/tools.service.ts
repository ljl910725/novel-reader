import { BadRequestException, Injectable } from '@nestjs/common';
import { AI_PROVIDER_DEFAULTS } from '@novel-reader/shared';
import { createHash } from 'node:crypto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ToolsService {
  constructor(private settings: SettingsService) {}

  async lookupDictionary(userId: string, word: string) {
    const trimmed = word.trim();
    if (!trimmed || trimmed.length > 100) {
      throw new BadRequestException('请选择有效词语');
    }

    const mobile = await this.settings.getMobileSettingsRaw(userId);

    if (mobile.defaultDictionary === 'youdao' && mobile.youdaoAppKey && mobile.youdaoAppSecret) {
      return this.youdaoLookup(trimmed, mobile.youdaoAppKey, mobile.youdaoAppSecret);
    }

    if (mobile.defaultDictionary === 'bing') {
      return this.bingLookup(trimmed);
    }

    return this.googleFallback(trimmed);
  }

  async aiExplain(userId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) {
      throw new BadRequestException('请选择不超过 500 字的文本');
    }

    const mobile = await this.settings.getMobileSettingsRaw(userId);
    if (!mobile.aiApiKey) {
      throw new BadRequestException('请先在设置中配置 AI API 密钥');
    }

    const baseUrl =
      mobile.aiProvider === 'custom'
        ? mobile.aiBaseUrl || AI_PROVIDER_DEFAULTS.openai
        : AI_PROVIDER_DEFAULTS[mobile.aiProvider];

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mobile.aiApiKey}`,
      },
      body: JSON.stringify({
        model: mobile.aiProvider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是阅读助手，用简洁中文解释用户选中的词句，包括含义、语境和用法。',
          },
          { role: 'user', content: `请解释：「${trimmed}」` },
        ],
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`AI 请求失败: ${err.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      text: trimmed,
      result: data.choices?.[0]?.message?.content ?? '无返回内容',
    };
  }

  private async youdaoLookup(word: string, appKey: string, appSecret: string) {
    const salt = String(Date.now());
    const sign = createHash('md5')
      .update(appKey + word + salt + appSecret)
      .digest('hex');
    const url = `https://openapi.youdao.com/api?q=${encodeURIComponent(word)}&from=auto&to=zh-CHS&appKey=${appKey}&salt=${salt}&sign=${sign}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      translation?: string[];
      basic?: { explains?: string[] };
      web?: Array<{ key: string; value: string[] }>;
    };
    const lines = [
      ...(data.translation ?? []),
      ...(data.basic?.explains ?? []),
      ...(data.web?.flatMap((w) => w.value) ?? []),
    ];
    return { word, dictionary: 'youdao', result: lines.join('\n') || '未找到释义' };
  }

  private async bingLookup(word: string) {
    const url = `https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 NovelReader/1.0' },
    });
    const html = await res.text();
    const match = html.match(/class="def_wrap"[^>]*>([\s\S]*?)<\/div>/i);
    const plain = match?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { word, dictionary: 'bing', result: plain || '未找到释义，可尝试切换词典' };
  }

  private googleFallback(word: string) {
    return {
      word,
      dictionary: 'google',
      result: `请在浏览器打开：https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(word)}`,
    };
  }
}
