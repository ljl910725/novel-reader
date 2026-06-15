import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ConfigController } from './config.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [ConfigController],
})
export class AppConfigModule {}
