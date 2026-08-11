import { Controller, Post, Get, Put, Delete, Body, Req, Query, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('import-pdf')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importPdf(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('course_id') courseId: string,
    @Body('subject_id') subjectId: string,
    @Body('department_id') departmentId: string,
    @Body('branch_id') branchId: string,
    @Body('semester_id') semesterId: string,
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
    return this.questionsService.importQuestionsFromPdf(
      file,
      courseId,
      String(tenantId),
      { department_id: departmentId, branch_id: branchId, semester_id: semesterId, subject_id: subjectId }
    );
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.createQuestion(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  findAll(
    @Query('course_id') courseId: string,
    @Query('subject_id') subjectId: string,
    @Query('department_id') departmentId: string,
    @Query('branch_id') branchId: string,
    @Query('semester_id') semesterId: string,
    @Query('tenant_id') tenantIdParam: string,
    @Req() req: Record<string, any>
  ) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    // Super admin can pick a specific college's question bank via tenant_id;
    // everyone else is locked to their own tenant.
    const tenantId = isSuperAdmin ? (tenantIdParam || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.getQuestions(String(tenantId), {
      course_id: courseId,
      subject_id: subjectId,
      department_id: departmentId,
      branch_id: branchId,
      semester_id: semesterId,
    });
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  update(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.updateQuestion(id, body, String(tenantId));
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  remove(@Param('id') id: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (req.body?.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.questionsService.deleteQuestion(id, String(tenantId));
  }
}
