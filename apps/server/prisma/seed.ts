import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_GUEST_PERMISSIONS,
  DEFAULT_DESKTOP_WINDOW,
  DEFAULT_READER_THEME,
  DEMO_STORE_SOURCES,
} from './seed-data';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo123', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@novel.local' },
    create: {
      email: 'demo@novel.local',
      passwordHash,
      nickname: '演示用户',
      emailVerified: true,
      settings: {
        create: {
          readerTheme: DEFAULT_READER_THEME,
          desktopWindow: DEFAULT_DESKTOP_WINDOW,
        },
      },
    },
    update: {},
  });

  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@novel.local' },
    create: {
      email: 'admin@novel.local',
      passwordHash: adminHash,
      nickname: '管理员',
      role: 'ADMIN',
      emailVerified: true,
      settings: {
        create: {
          readerTheme: DEFAULT_READER_THEME,
          desktopWindow: DEFAULT_DESKTOP_WINDOW,
        },
      },
    },
    update: {},
  });

  for (const source of DEMO_STORE_SOURCES) {
    const { id: _id, description, ...config } = source;
    const exists = await prisma.bookSource.findFirst({
      where: { isStore: true, name: config.bookSourceName },
    });
    if (!exists) {
      await prisma.bookSource.create({
        data: {
          name: config.bookSourceName,
          legadoConfig: { ...config, bookSourceComment: description },
          isStore: true,
          storeStatus: 'healthy',
          lastChecked: new Date(),
          group: '书源商店',
        },
      });
    }
  }

  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', guestPermissions: DEFAULT_GUEST_PERMISSIONS },
    update: {},
  });

  console.log('Seed complete. Demo user:', demoUser.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
