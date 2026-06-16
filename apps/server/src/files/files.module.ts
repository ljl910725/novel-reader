import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { decodeMulterFilename } from '@novel-reader/file-parser';
import { memoryStorage } from 'multer';
import { PermissionsModule } from '../permissions/permissions.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [
    PermissionsModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        file.originalname = decodeMulterFilename(file.originalname);
        cb(null, true);
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
