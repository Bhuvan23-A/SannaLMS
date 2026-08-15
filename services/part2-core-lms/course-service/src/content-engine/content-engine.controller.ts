import {
  Controller, Post, Get, Param, UseGuards, Req, Res,
  UploadedFile, UseInterceptors, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
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
        // Save to a temp dir first; uploadFile() then moves the file to the
        // final uploads/{tenant}/{course}/{module}/{lesson}/ path once the
        // topic's real module/lesson/tenant are resolved from the DB.
        destination: (_req: any, _file, cb) => {
          const tmpDir = join(process.cwd(), 'uploads', 'tmp');
          if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
          cb(null, tmpDir);
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

    const assetType = this.detectAssetType(extname(file.originalname).toLowerCase());

    // Resolve the topic's own college/module/lesson — never trust the uploader's
    // tenant (a super admin would otherwise write into 'master' and the college
    // students could not reach the file under the college path).
    let tenantId = 'master';
    let courseId = 'unknown-course';
    let moduleId = 'unknown-module';
    let lessonId = 'unknown-lesson';
    try {
      const topic = await this.contentService.getTopicContext(topicId);
      if (topic) {
        tenantId = topic.tenant_id || tenantId;
        lessonId = topic.lesson_id || lessonId;
        moduleId = topic.lesson?.module_id || moduleId;
        courseId = topic.lesson?.module?.course?.id || topic.lesson?.module?.course_id || courseId;
      }
    } catch { /* keep the safe defaults */ }

    // Move the temp file into its final home.
    const uploadDir = join(process.cwd(), 'uploads', tenantId, courseId, moduleId, lessonId);
    let finalPath = file.path;
    try {
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      finalPath = join(uploadDir, file.filename);
      renameSync(file.path, finalPath);
    } catch (err) {
      this.contentService.logger.warn(`Could not move upload to ${uploadDir}: ${err}`);
    }

    // Re-uploads supersede the previous asset instead of accumulating orphan
    // rows — remove the old one (row + file) before creating the new record.
    const existing = await this.contentService.getAssetByTopic(topicId);
    if (existing) {
      if (existing.physical_path) {
        try { unlinkSync(existing.physical_path); } catch { /* file already gone */ }
      }
      await this.contentService.deleteAsset(existing.id);
    }

    // Documents are immediately usable; only videos go through the pipeline.
    const initialStatus = assetType === 'VIDEO' ? 'UPLOADING' : 'READY';
    const asset = await this.contentService.createAssetRecord({
      topicId,
      tenantId,
      type: assetType,
      physicalPath: finalPath,
      fileSize: file.size,
      originalName: file.originalname,
      initialStatus,
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
      path: finalPath,
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
