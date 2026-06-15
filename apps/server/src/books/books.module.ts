import { Module } from '@nestjs/common';
import { SourcesModule } from '../sources/sources.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [SourcesModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
