import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { EmailService } from '../email/email.service';
import { REDIS } from '../redis/redis.module';

export type OtpPurpose = 'register' | 'reset-password' | 'change-email';

const TTL_SECONDS = 600;
const RATE_LIMIT_SECONDS = 60;

@Injectable()
export class VerificationService {
  constructor(
    @Inject(REDIS) private redis: Redis,
    private email: EmailService,
  ) {}

  private key(purpose: OtpPurpose, email: string) {
    return `otp:${purpose}:${email.toLowerCase()}`;
  }

  private rateKey(purpose: OtpPurpose, email: string) {
    return `otp:rate:${purpose}:${email.toLowerCase()}`;
  }

  private generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async sendCode(purpose: OtpPurpose, email: string, subject: string) {
    const normalized = email.toLowerCase();
    const rate = await this.redis.get(this.rateKey(purpose, normalized));
    if (rate) throw new BadRequestException('发送过于频繁，请 60 秒后再试');

    const code = this.generateCode();
    await this.redis.setex(this.key(purpose, normalized), TTL_SECONDS, code);
    await this.redis.setex(this.rateKey(purpose, normalized), RATE_LIMIT_SECONDS, '1');

    const mail = await this.email.sendVerificationCode(normalized, subject, code);
    return {
      ok: true,
      message: '验证码已发送，请查收邮箱',
      devCode: mail.devMode ? code : undefined,
    };
  }

  async verifyCode(purpose: OtpPurpose, email: string, code: string) {
    const normalized = email.toLowerCase();
    const stored = await this.redis.get(this.key(purpose, normalized));
    if (!stored || stored !== code) {
      throw new BadRequestException('验证码错误或已过期');
    }
    await this.redis.del(this.key(purpose, normalized));
    return true;
  }
}
