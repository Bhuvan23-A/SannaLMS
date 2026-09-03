import {
  Controller, Post, Get, Delete, Param, Req, Body, Res,
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
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'TRAINER')
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
    if (!file && !body.link_url) {
      throw new BadRequestException('Please upload a file or provide a Google Drive / resource link.');
    }
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.resourcesService.createResource(
      courseId,
      String(tenantId),
      file,
      body.title,
      body.visibility,
      body.assigned_to,
      body.link_url
    );
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  list(@Param('courseId') courseId: string, @Req() req: any) {
    const roles = (req.user?.roles || []).map((r: string) => r.toUpperCase());
    const isStudent = roles.includes('STUDENT');
    const userId = req.user?.id || '';
    return this.resourcesService.listResources(courseId, isStudent, userId);
  }

  @Get(':id/download')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async download(@Param('id') id: string, @Res() res: any) {
    const resource = await this.resourcesService.getResource(id);
    if (resource.link_url || resource.content_type === 'link' || resource.file_path?.startsWith('http')) {
      return res.redirect(resource.link_url || resource.file_path);
    }
    if (!existsSync(resource.file_path)) {
      throw new BadRequestException('File not found on disk');
    }
    res.set({
      'Content-Type': resource.content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(resource.file_name)}"`,
    });
    res.sendFile(resource.file_path);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  remove(@Param('id') id: string) {
    return this.resourcesService.removeResource(id);
  }
}
