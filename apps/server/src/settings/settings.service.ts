import { Injectable } from '@nestjs/common';
import {
  DEFAULT_DESKTOP_WINDOW,
  DEFAULT_MOBILE_SETTINGS,
  DEFAULT_READER_THEME,
  desktopWindowSchema,
  mobileSettingsSchema,
  readerThemeSchema,
} from '@novel-reader/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getReader(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return s?.readerTheme ?? DEFAULT_READER_THEME;
  }

  async saveReader(userId: string, theme: unknown) {
    const parsed = readerThemeSchema.parse(theme);
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, readerTheme: parsed as object, desktopWindow: DEFAULT_DESKTOP_WINDOW as object },
      update: { readerTheme: parsed as object },
    });
    return parsed;
  }

  async getDesktop(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return s?.desktopWindow ?? DEFAULT_DESKTOP_WINDOW;
  }

  async saveDesktop(userId: string, window: unknown) {
    const parsed = desktopWindowSchema.parse(window);
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, readerTheme: DEFAULT_READER_THEME as object, desktopWindow: parsed as object },
      update: { desktopWindow: parsed as object },
    });
    return parsed;
  }

  async getMobile(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return s?.mobileSettings ?? DEFAULT_MOBILE_SETTINGS;
  }

  async saveMobile(userId: string, settings: unknown) {
    const parsed = mobileSettingsSchema.parse(settings);
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        readerTheme: DEFAULT_READER_THEME as object,
        desktopWindow: DEFAULT_DESKTOP_WINDOW as object,
        mobileSettings: parsed as object,
      },
      update: { mobileSettings: parsed as object },
    });
    return parsed;
  }

  async getMobileSettingsRaw(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    const raw = (s?.mobileSettings ?? DEFAULT_MOBILE_SETTINGS) as Record<string, string>;
    return mobileSettingsSchema.parse(raw);
  }
}
