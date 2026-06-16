import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    this.from = config.get('SMTP_FROM', 'NovelReader <noreply@novel-reader.local>');
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get('SMTP_PORT', 587)),
        secure: config.get('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: config.get('SMTP_USER'),
          pass: config.get('SMTP_PASS'),
        },
      });
    }
  }

  async sendVerificationCode(to: string, subject: string, code: string) {
    const text = `您的验证码是：${code}，10 分钟内有效。如非本人操作请忽略此邮件。`;
    const html = `<p>您的验证码是：<strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>10 分钟内有效。如非本人操作请忽略此邮件。</p>`;

    if (!this.transporter) {
      this.logger.warn(`[邮件未配置] 发送至 ${to}，验证码: ${code}`);
      return { sent: true, devMode: true };
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    return { sent: true, devMode: false };
  }
}
