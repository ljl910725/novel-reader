import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BooksService } from './books.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(private books: BooksService) {}

  @Get('books/:id')
  getBook(@Param('id') id: string) {
    return this.books.getBook(id);
  }

  @Get('books/:id/chapters')
  getChapters(@Param('id') id: string) {
    return this.books.getChapters(id);
  }

  @Get('chapters/:id/content')
  getContent(@Param('id') id: string) {
    return this.books.getChapterContent(id);
  }

  @Post('local-books')
  registerLocal(
    @CurrentUser('sub') userId: string,
    @Body() body: Parameters<BooksService['registerLocalBook']>[1],
  ) {
    return this.books.registerLocalBook(userId, body);
  }

  @Patch('local-books/:id/relink')
  relink(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { localFilePath: string; fileHash: string },
  ) {
    return this.books.relinkLocalBook(userId, id, body.localFilePath, body.fileHash);
  }
}
