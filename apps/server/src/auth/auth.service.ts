import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DEFAULT_DESKTOP_WINDOW, DEFAULT_READER_THEME } from '@novel-reader/shared';
import * as bcrypt from 'bcrypt';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private permissions: PermissionsService,
    private verification: VerificationService,
  ) {}

  async sendRegisterCode(email: string) {
    const exists = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) throw new ConflictException('该邮箱已注册');
    return this.verification.sendCode('register', email, 'NovelReader 注册验证码');
  }

  async register(email: string, password: string, nickname: string, code: string) {
    const normalized = email.toLowerCase();
    await this.verification.verifyCode('register', normalized, code);

    const exists = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (exists) throw new ConflictException('该邮箱已注册');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
        nickname,
        emailVerified: true,
        settings: {
          create: {
            readerTheme: DEFAULT_READER_THEME as object,
            desktopWindow: DEFAULT_DESKTOP_WINDOW as object,
          },
        },
      },
    });

    return this.tokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string, rememberDays: number) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('邮箱或密码错误');

    return this.tokens(user.id, user.email, user.role, rememberDays);
  }

  async sendResetCode(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      await this.verification.sendCode('reset-password', email, 'NovelReader 找回密码验证码');
    }
    return { ok: true, message: '若该邮箱已注册，验证码将发送到您的邮箱' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalized = email.toLowerCase();
    await this.verification.verifyCode('reset-password', normalized, code);

    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user) throw new BadRequestException('用户不存在');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return { ok: true, message: '密码已重置，请使用新密码登录' };
  }

  async sendChangeEmailCode(userId: string, newEmail: string) {
    const normalized = newEmail.toLowerCase();
    const taken = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (taken && taken.id !== userId) throw new ConflictException('该邮箱已被使用');
    return this.verification.sendCode('change-email', normalized, 'NovelReader 更换邮箱验证码');
  }

  async updateProfile(userId: string, nickname: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
      select: { id: true, email: true, nickname: true, role: true, emailVerified: true, onboardingDone: true },
    });
  }

  async changeEmail(userId: string, newEmail: string, code: string) {
    const normalized = newEmail.toLowerCase();
    await this.verification.verifyCode('change-email', normalized, code);

    const taken = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (taken && taken.id !== userId) throw new ConflictException('该邮箱已被使用');

    return this.prisma.user.update({
      where: { id: userId },
      data: { email: normalized, emailVerified: true },
      select: { id: true, email: true, nickname: true, role: true, emailVerified: true, onboardingDone: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('当前密码错误');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true, message: '密码已修改' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('用户不存在');
      const rememberDays =
        typeof payload.rememberDays === 'number' && payload.rememberDays > 0
          ? payload.rememberDays
          : undefined;
      return this.tokens(user.id, user.email, user.role, rememberDays);
    } catch {
      throw new UnauthorizedException('刷新令牌无效');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        emailVerified: true,
        onboardingDone: true,
      },
    });
    if (!user) return null;
    const permissions = await this.permissions.getUserPermissions(userId);
    return { ...user, permissions };
  }

  async completeOnboarding(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDone: true },
    });
  }

  private tokens(userId: string, email: string, role: string, rememberDays?: number) {
    const payload: { sub: string; email: string; role: string; rememberDays?: number } = {
      sub: userId,
      email,
      role,
    };
    if (rememberDays && rememberDays > 0) {
      payload.rememberDays = rememberDays;
    }
    const accessToken = this.jwt.sign(payload);
    const refreshExpiresIn =
      rememberDays > 0
        ? `${rememberDays}d`
        : rememberDays === 0
          ? '1d'
          : this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      expiresIn: refreshExpiresIn,
    });
    return { accessToken, refreshToken };
  }
}
