import {
  Controller, Post, Get, Param, UseGuards, Req, Res,
  UploadedFile, UseInterceptors, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { ContentEngineService } from './content-engine.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/content')
export class ContentEngineController {
  constructor(private readonly contentService: ContentEngineService) {}

  /**
   * Upload a file (video, document, SCORM zip) for a topic.
   * Storage path: uploads/{tenant_id}/{course_id}/{module_id}/{lesson_id}/{filename}
   */
  @Post('upload/:topicId')
  @Roles('PRIMARY_TRAINER', 'COLLEGE_ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, _file, cb) => {
          // Build hierarchical path from query params or body
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
          const courseId  = req.query.course_id  || 'unknown-course';
          const moduleId  = req.query.module_id  || 'unknown-module';
          const lessonId  = req.query.lesson_id  || 'unknown-lesson';
          const uploadDir = join(process.cwd(), 'uploads', tenantId, courseId, moduleId, lessonId);
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
      fileFilter: (_req, file, cb) => {
        const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.pdf', '.docx', '.pptx', '.zip', '.scorm'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${ext} not allowed`), false);
        }
      }
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('topicId') topicId: string,
    @Req() req: any
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    const assetType = this.detectAssetType(extname(file.originalname).toLowerCase());

    const asset = await this.contentService.createAssetRecord({
      topicId,
      tenantId,
      type: assetType,
      physicalPath: file.path,
      fileSize: file.size,
      originalName: file.originalname,
    });

    // If video, trigger async HLS processing stub
    if (assetType === 'VIDEO') {
      // Non-blocking: process in background
      this.contentService.processVideo(asset.id).catch(() => {});
    }

    return {
      message: 'File uploaded successfully',
      asset_id: asset.id,
      type: assetType,
      status: asset.status,
      path: file.path,
      size: file.size,
    };
  }

  /** Get asset metadata for a topic */
  @Get('asset/:topicId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  getAsset(@Param('topicId') topicId: string) {
    return this.contentService.getAssetByTopic(topicId);
  }

  /** Manually trigger video processing (for testing) */
  @Post('video/process/:assetId')
  @Roles('PRIMARY_TRAINER', 'SUPER_ADMIN')
  processVideo(@Param('assetId') assetId: string) {
    return this.contentService.processVideo(assetId);
  }

  private detectAssetType(ext: string): string {
    if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'VIDEO';
    if (['.zip', '.scorm'].includes(ext)) return 'SCORM';
    return 'DOCUMENT';
  }
}
