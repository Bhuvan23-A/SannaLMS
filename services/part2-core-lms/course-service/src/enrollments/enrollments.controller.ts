import { Controller, Get, Post, Delete, Body, Param, Req, Query } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { Roles } from '../roles.guard';

interface BulkEnrollBody {
  user_ids?: string[];
  course_ids?: string[];
  branch_id?: string;
  semester_id?: string;
  section_id?: string;
  tenant_id?: string;
}

@Controller('api/v1/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  enroll(@Body() body: any, @Req() req: any) {
    // tenant_id is derived from the caller's college when not sent by the client.
    return this.enrollmentsService.enroll(body, body.tenant_id || req.user?.tenantId || 'test-tenant');
  }

  // Bulk enroll (#bulk): enroll a list of students into a list of courses at
  // once — resolves to every course of a branch/semester when branch_id +
  // semester_id are given. Skips students/courses already enrolled.
  @Post('bulk')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  bulkEnroll(@Body() body: BulkEnrollBody, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.enrollmentsService.bulkEnroll(body, String(tenantId));
  }

  // Platform/college-wide enrollment list — powers the dashboard & analytics
  // counts (#fix). Super admin sees every tenant; everyone else is scoped to
  // their own college.
  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  findAllEnrollments(@Req() req: any, @Query('count') count?: string) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    // Lightweight count mode — the dashboard/analytics only need a number, not
    // thousands of enrollment rows (#perf).
    if (count === '1' || count === 'true') {
      return this.enrollmentsService.countByTenant(String(tenantId));
    }
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

  // Unenroll a student from a course (#fix) — lets admins correct mistaken
  // enrollments (e.g. a student added to the wrong course by accident).
  @Delete('course/:courseId/user/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  removeByCourseAndUser(@Param('courseId') courseId: string, @Param('userId') userId: string) {
    return this.enrollmentsService.removeByCourseAndUser(courseId, userId);
  }
}
