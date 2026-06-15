import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { SourcesModule } from '../sources/sources.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [SourcesModule, PermissionsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
