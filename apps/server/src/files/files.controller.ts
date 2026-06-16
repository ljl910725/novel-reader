import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { RequireAnyPermission } from '../common/decorators/require-any-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Post('upload')
  @RequirePermission('cloudUpload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.files.upload(userId, file);
  }

  @Post('upload/batch')
  @RequirePermission('cloudUpload')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadBatch(
    @CurrentUser('sub') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const list = Array.isArray(files) ? files : [];
    const results = [];
    for (const f of list) {
      // 顺序处理，避免瞬时高并发占用大量内存（每个 file.buffer 可能较大）
      results.push(await this.files.upload(userId, f));
    }
    return { results };
  }

  @Get()
  @RequireAnyPermission('cloudUpload', 'cloudSync')
  list(@CurrentUser('sub') userId: string) {
    return this.files.list(userId);
  }

  @Get(':id/status')
  @RequireAnyPermission('cloudUpload', 'cloudSync')
  status(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.files.status(userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.files.remove(userId, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.files.download(userId, id);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }
}
