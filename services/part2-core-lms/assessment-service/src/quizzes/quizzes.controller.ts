import { Controller, Post, Get, Put, Delete, Body, Req, Query, Param, BadRequestException, Res } from '@nestjs/common';
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

  @Put(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  update(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.quizzesService.updateQuiz(id, body, String(tenantId));
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

  // The signed-in student's quiz-score percentile vs the whole college —
  // powers the "Adaptive Score Rank" card in the command center (#live-stats).
  @Get('my-rank')
  @Roles('STUDENT')
  myRank(@Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (req.query?.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.quizzesService.myScorePercentile(String(tenantId), String(req.user?.id || 'u-1'));
  }

  // Student attempts + scores for a quiz — trainers & college admins review these (#10)
  @Get(':id/submissions')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  getSubmissions(@Param('id') id: string) {
    return this.quizzesService.getQuizSubmissions(id);
  }

  // CSV export of quiz submissions with institutional score report metadata
  @Get(':id/submissions/export')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  async exportSubmissions(@Param('id') id: string, @Res() res: any) {
    const data = await this.quizzesService.getQuizSubmissions(id);
    const quiz = data.quiz;
    const totalMarks = (data.questions || []).reduce((acc: number, q: any) => acc + (q.marks || 0), 0);

    const now = new Date();
    const downloadDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const downloadTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const assessmentDate = quiz?.start_time
      ? new Date(quiz.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : downloadDate;
    const durationMins = quiz?.duration_mins || 30;

    let startTimeStr = '09:00 AM';
    let endTimeStr = '09:30 AM';
    if (quiz?.start_time) {
      startTimeStr = new Date(quiz.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      endTimeStr = quiz?.end_time
        ? new Date(quiz.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : startTimeStr;
    }

    const titleStr = quiz?.title || 'Assessment';
    const metadataHeader = 
`Edulateral Foundation
User Score Report of : ${titleStr}
Assessment Date : ${assessmentDate}
Assessment Time : ${startTimeStr} - ${endTimeStr} (${durationMins} Minutes)
Downloaded On : ${downloadDate} ${downloadTime}

Sl.no,Candidate ID,Candidate Name,Candidate Email,Group,Unique ID,Assessment Status,Malpractice Logs,Marks Obtained
`;

    const rows = (data.submissions || []).map((s: any, idx: number) => {
      const slNo = idx + 1;
      const candidateId = s.user_id ? s.user_id.slice(0, 8) : `CAND-${slNo}`;
      const candidateName = `Candidate ${slNo}`;
      const candidateEmail = s.user_id ? `${s.user_id}@student.lms` : '—';
      const group = s.tenant_id || 'Default Batch';
      const uniqueId = s.user_id || `UID-${slNo}`;
      const status = s.is_graded ? 'Graded' : 'Submitted';
      const malpractice = `${s.violation_count || 0} Violations`;
      const marks = `${s.score ?? 0} / ${totalMarks}`;
      return `${slNo},"${candidateId}","${candidateName}","${candidateEmail}","${group}","${uniqueId}","${status}","${malpractice}","${marks}"`;
    }).join('\n');

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="Score_Report_${titleStr.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv"`,
    });
    res.send('\uFEFF' + metadataHeader + rows);
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

  @Get(':id/my-submission')
  @Roles('STUDENT')
  mySubmission(@Param('id') id: string, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    return this.quizzesService.getMyQuizSubmission(id, String(userId));
  }

  @Post(':id/submit')
  @Roles('STUDENT')
  submit(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.quizzesService.submitQuiz(id, body.answers, String(userId), String(tenantId), body.proctoring);
  }

  // Delete a quiz — removes its question links and submissions (cascade), so
  // a trainer who created the wrong quiz can remove it (#fix).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  remove(@Param('id') id: string) {
    return this.quizzesService.deleteQuiz(id);
  }
}
