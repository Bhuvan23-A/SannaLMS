import { Controller, Post, Get, Delete, Body, Req, Query, Param, Put, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // Student uploads their assignment file BEFORE submitting. The file lands in
  // the shared uploads volume under /uploads/assignments/{tenant}/{assignment}/,
  // and the returned URL is stored as the submission's file_url so the trainer
  // can actually open the attachment.
  @Post('upload')
  @Roles('STUDENT')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, _file, cb) => {
        const tenantId = req.user?.tenantId || 'test-tenant';
        const assignmentId = req.query.assignment_id || 'unknown';
        const dir = join(process.cwd(), 'uploads', 'assignments', String(tenantId), String(assignmentId));
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${safe}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Record<string, any>) {
    if (!file) throw new BadRequestException('No file uploaded — use multipart field "file".');
    const tenantId = req.user?.tenantId || 'test-tenant';
    const assignmentId = req.query.assignment_id || 'unknown';
    return {
      url: `/uploads/assignments/${tenantId}/${assignmentId}/${file.filename}`,
      size: file.size,
      originalName: file.originalname,
    };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.assignmentsService.createAssignment(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Query('course_ids') courseIds: string, @Query('tenant_id') tenantParam: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    // Super admins browse per college: they pass the selected college's
    // tenant_id (e.g. greenvalley). Without it they'd only ever see the
    // master tenant, which is empty for real colleges.
    const tenantId = isSuperAdmin ? (tenantParam || 'master') : (req.user?.tenantId || 'test-tenant');
    const viewer = { roles: req.user?.roles || [], userId: req.user?.id || '' };
    // Students pass their enrolled course ids so the list is scoped to the
    // courses they are actually enrolled in (#scoping).
    const ids = courseIds ? courseIds.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
    return this.assignmentsService.getAssignments(String(tenantId), courseId, viewer, ids);
  }

  // Student submissions + scores for an assignment — trainers & college admins review these (#13)
  @Get(':id/submissions')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getAssignmentSubmissions(id);
  }

  @Post(':id/submit')
  @Roles('STUDENT')
  submit(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.assignmentsService.submitAssignment(id, body, String(userId), String(tenantId));
  }

  // The student's own submission for an assignment, incl. trainer score/feedback
  @Get(':id/my-submission')
  @Roles('STUDENT')
  mySubmission(@Param('id') id: string, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    return this.assignmentsService.getMySubmission(id, String(userId));
  }

  @Put('submissions/:id/grade')
  @Roles('PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'COLLEGE_ADMIN', 'SUPER_ADMIN')
  grade(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.assignmentsService.gradeAssignment(id, body.score, body.feedback);
  }

  // Delete an assignment — removes its submissions (cascade), so a trainer
  // who created the wrong assignment can remove it (#fix).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  remove(@Param('id') id: string) {
    return this.assignmentsService.deleteAssignment(id);
  }
}
