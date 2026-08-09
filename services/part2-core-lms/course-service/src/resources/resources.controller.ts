import {
  Controller, Post, Get, Delete, Param, Req, Body,
  UploadedFile, UseInterceptors, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ResourcesService } from './resources.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/courses/:courseId/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, _file, cb) => {
          const isSuperAdmin = req.user?.roles?.includes('superadmin');
          const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
          const courseId = req.params.courseId || 'unknown-course';
          const uploadDir = join(process.cwd(), 'uploads', tenantId, courseId, 'resources');
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    })
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Param('courseId') courseId: string,
    @Body() body: Record<string, any>,
    @Req() req: any
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Use multipart field "file".');
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.resourcesService.createResource(courseId, String(tenantId), file, body.title);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  list(@Param('courseId') courseId: string) {
    return this.resourcesService.listResources(courseId);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  remove(@Param('id') id: string) {
    return this.resourcesService.removeResource(id);
  }
}
