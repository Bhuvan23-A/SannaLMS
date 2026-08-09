import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  enroll(@Body() body: any, @Req() req: any) {
    return this.enrollmentsService.enroll(body, body.tenant_id);
  }

  // Platform/college-wide enrollment list — powers the dashboard & analytics
  // counts (#fix). Super admin sees every tenant; everyone else is scoped to
  // their own college.
  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  findAllEnrollments(@Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.enrollmentsService.findAllByTenant(String(tenantId));
  }

  @Get('user/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  findAll(@Param('userId') userId: string) {
    return this.enrollmentsService.findAll(userId);
  }

  // Full roster of students enrolled in a course — powers attendance rosters (#15),
  // assign-to-individual (#11/#12) and student management UIs.
  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  findByCourse(@Param('courseId') courseId: string) {
    return this.enrollmentsService.findByCourse(courseId);
  }
}
