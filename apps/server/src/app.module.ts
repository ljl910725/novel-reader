import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { FilesModule } from './files/files.module';
import { GuestModule } from './guest/guest.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { ShelfModule } from './shelf/shelf.module';
import { SourceStoreModule } from './source-store/source-store.module';
import { SourceWizardModule } from './source-wizard/source-wizard.module';
import { SourcesModule } from './sources/sources.module';
import { ToolsModule } from './tools/tools.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AppConfigModule,
    GuestModule,
    AuthModule,
    SourcesModule,
    SourceStoreModule,
    SourceWizardModule,
    SearchModule,
    BooksModule,
    ShelfModule,
    ProgressModule,
    SettingsModule,
    FilesModule,
    AdminModule,
    ToolsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
