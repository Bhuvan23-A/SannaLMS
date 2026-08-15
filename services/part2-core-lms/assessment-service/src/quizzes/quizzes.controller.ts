import { Controller, Post, Get, Put, Delete, Body, Req, Query, Param, BadRequestException } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.quizzesService.createQuiz(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Query('course_ids') courseIds: string, @Query('tenant_id') tenantParam: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    // Super admins browse per college: they pass the selected college's
    // tenant_id so they see that college's quizzes, not the empty master tenant.
    const tenantId = isSuperAdmin ? (tenantParam || 'master') : (req.user?.tenantId || 'test-tenant');
    const viewer = { roles: req.user?.roles || [], userId: req.user?.id || '' };
    // Students pass their enrolled course ids so the list is scoped to the
    // courses they are actually enrolled in (#scoping).
    const ids = courseIds ? courseIds.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined;
    return this.quizzesService.getQuizzes(String(tenantId), courseId, viewer, ids);
  }

  // Student attempts + scores for a quiz — trainers & college admins review these (#10)
  @Get(':id/submissions')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  getSubmissions(@Param('id') id: string) {
    return this.quizzesService.getQuizSubmissions(id);
  }

  // Manually grade an essay/coding quiz submission — score + feedback are
  // released to the student and picked up by the gradebook (#essay-grading).
  @Put('submissions/:id/grade')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  grade(@Param('id') id: string, @Body() body: { score?: number; feedback?: string }) {
    if (body.score === undefined || body.score === null) {
      throw new BadRequestException('A valid score is required');
    }
    return this.quizzesService.gradeQuizSubmission(id, body.score, body.feedback || '');
  }

  @Post(':id/submit')
  @Roles('STUDENT')
  submit(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.quizzesService.submitQuiz(id, body.answers, String(userId), String(tenantId));
  }

  // Delete a quiz — removes its question links and submissions (cascade), so
  // a trainer who created the wrong quiz can remove it (#fix).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  remove(@Param('id') id: string) {
    return this.quizzesService.deleteQuiz(id);
  }
}
