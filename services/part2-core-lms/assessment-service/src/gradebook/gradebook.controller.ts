import { Controller, Post, Get, Param, Req, Query, Body } from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Post(':courseId/calculate/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  calculate(@Param('courseId') courseId: string, @Param('userId') userId: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body?.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.gradebookService.calculateGrade(String(tenantId), courseId, userId);
  }

  @Get(':courseId/student/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getStudentGrade(@Param('courseId') courseId: string, @Param('userId') userId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    // RBAC: a student may only view their own grade (mock fallback kept for dev/testing).
    // Every Keycloak user carries the realm-default 'student' role, so staff
    // (admins/trainers) must be excluded or they'd be blocked from viewing grades.
    const rawRoles: string[] = req.user?.roles || (req.headers['x-mock-roles'] ? (req.headers['x-mock-roles'] as string).split(',') : []);
    const callerId: string = req.user?.id || (req.headers['x-mock-user-id'] as string) || '';
    const isStaffCaller = rawRoles.some(r => ['superadmin', 'super_admin', 'tenantadmin', 'college_admin', 'admin', 'primary_trainer', 'teaching_assistant', 'instructor', 'trainer', 'assistant', 'guest_faculty'].includes(String(r).toLowerCase()));
    const isStudentCaller = rawRoles.some(r => ['student'].includes(String(r).toLowerCase())) && !isStaffCaller;
    if (isStudentCaller && callerId && callerId !== userId) {
      return { error: 'Unauthorized', message: 'Students can only view their own grades.' };
    }
    return this.gradebookService.getGradebook(String(tenantId), courseId, userId);
  }

  @Get(':courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  getCourseGrades(@Param('courseId') courseId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.gradebookService.getCourseGrades(String(tenantId), courseId);
  }
}
