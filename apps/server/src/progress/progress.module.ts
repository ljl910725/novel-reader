import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [PermissionsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
