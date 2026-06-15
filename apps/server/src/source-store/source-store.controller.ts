import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SourceStoreService } from './source-store.service';

@Controller('source-store')
export class SourceStoreController {
  constructor(private store: SourceStoreService) {}

  @Get()
  list() {
    return this.store.list();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/import')
  import(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.store.importToUser(userId, id);
  }
}
