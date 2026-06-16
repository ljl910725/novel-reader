import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  changeEmailSchema,
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendEmailCodeSchema,
  updateProfileSchema,
} from '@novel-reader/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('send-register-code')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  sendRegisterCode(@Body() body: unknown) {
    const { email } = sendEmailCodeSchema.parse(body);
    return this.auth.sendRegisterCode(email);
  }

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = registerSchema.parse(body);
    return this.auth.register(parsed.email, parsed.password, parsed.nickname, parsed.code);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = loginSchema.parse(body);
    return this.auth.login(parsed.email, parsed.password, parsed.rememberDays ?? 0);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  forgotPassword(@Body() body: unknown) {
    const { email } = sendEmailCodeSchema.parse(body);
    return this.auth.sendResetCode(email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: unknown) {
    const parsed = resetPasswordSchema.parse(body);
    return this.auth.resetPassword(parsed.email, parsed.code, parsed.newPassword);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.auth.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    const { nickname } = updateProfileSchema.parse(body);
    return this.auth.updateProfile(userId, nickname);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-change-email-code')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  sendChangeEmailCode(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    const { email } = sendEmailCodeSchema.parse(body);
    return this.auth.sendChangeEmailCode(userId, email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('email')
  changeEmail(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    const parsed = changeEmailSchema.parse(body);
    return this.auth.changeEmail(userId, parsed.newEmail, parsed.code);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    const parsed = changePasswordSchema.parse(body);
    return this.auth.changePassword(userId, parsed.currentPassword, parsed.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/complete')
  completeOnboarding(@CurrentUser('sub') userId: string) {
    return this.auth.completeOnboarding(userId);
  }
}
