import { Module } from '@nestjs/common';
import { BooksModule } from '../books/books.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ShelfController } from './shelf.controller';
import { ShelfService } from './shelf.service';

@Module({
  imports: [BooksModule, PermissionsModule],
  controllers: [ShelfController],
  providers: [ShelfService],
})
export class ShelfModule {}
