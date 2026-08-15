import { Controller, Post, Get, Delete, Body, Req, Query, Param, Put } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.assignmentsService.createAssignment(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    const viewer = { roles: req.user?.roles || [], userId: req.user?.id || '' };
    return this.assignmentsService.getAssignments(String(tenantId), courseId, viewer);
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
