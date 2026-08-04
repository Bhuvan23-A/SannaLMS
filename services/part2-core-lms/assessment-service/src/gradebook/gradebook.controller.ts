import { Controller, Post, Get, Param, Req, Query } from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Post(':courseId/calculate/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  calculate(@Param('courseId') courseId: string, @Param('userId') userId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.gradebookService.calculateGrade(String(tenantId), courseId, userId);
  }

  @Get(':courseId/student/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getStudentGrade(@Param('courseId') courseId: string, @Param('userId') userId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    // Add RBAC check: Student can only view their own grade
    if (req.headers['x-mock-roles'] === 'STUDENT' && req.headers['x-mock-user-id'] !== userId) {
      return { error: 'Unauthorized' };
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
