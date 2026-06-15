import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { SourceWizardController } from './source-wizard.controller';
import { SourceWizardService } from './source-wizard.service';
import { SourcesModule } from '../sources/sources.module';

@Module({
  imports: [SourcesModule, PermissionsModule],
  controllers: [SourceWizardController],
  providers: [SourceWizardService],
})
export class SourceWizardModule {}
