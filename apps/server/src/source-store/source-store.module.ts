import { Module } from '@nestjs/common';
import { SourceStoreController } from './source-store.controller';
import { SourceStoreService } from './source-store.service';

@Module({ controllers: [SourceStoreController], providers: [SourceStoreService] })
export class SourceStoreModule {}
