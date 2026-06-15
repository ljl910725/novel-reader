import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('reader')
  getReader(@CurrentUser('sub') userId: string) {
    return this.settings.getReader(userId);
  }

  @Put('reader')
  saveReader(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    return this.settings.saveReader(userId, body);
  }

  @Get('desktop')
  getDesktop(@CurrentUser('sub') userId: string) {
    return this.settings.getDesktop(userId);
  }

  @Put('desktop')
  saveDesktop(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    return this.settings.saveDesktop(userId, body);
  }

  @Get('mobile')
  getMobile(@CurrentUser('sub') userId: string) {
    return this.settings.getMobile(userId);
  }

  @Put('mobile')
  saveMobile(@CurrentUser('sub') userId: string, @Body() body: unknown) {
    return this.settings.saveMobile(userId, body);
  }
}
