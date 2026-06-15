import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { loginSchema, registerSchema } from '@novel-reader/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = registerSchema.parse(body);
    return this.auth.register(parsed.email, parsed.password, parsed.nickname);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = loginSchema.parse(body);
    return this.auth.login(parsed.email, parsed.password);
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
  @Post('onboarding/complete')
  completeOnboarding(@CurrentUser('sub') userId: string) {
    return this.auth.completeOnboarding(userId);
  }
}
