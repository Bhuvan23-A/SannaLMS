import { Controller, Post, Get, Body, Req, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('import-pdf')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importPdf(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('course_id') courseId: string,
    @Req() req: Record<string, any>
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use multipart form field named "file".');
    }
    // Verify magic bytes (%PDF-) — mimetype/originalname come from the client and can be spoofed
    const isPdf = file.buffer && file.buffer.length >= 5 && file.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    if (!isPdf) {
      throw new BadRequestException('Only PDF files are supported.');
    }
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (req.body?.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.importQuestionsFromPdf(file, courseId, String(tenantId));
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.createQuestion(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.getQuestions(String(tenantId), courseId);
  }
}
