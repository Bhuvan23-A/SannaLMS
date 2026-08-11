import { Controller, Get, Post, Body, Param, Req, Delete, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('COLLEGE_ADMIN')
  create(@Body() createCourseDto: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (createCourseDto.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.coursesService.create(createCourseDto, String(tenantId));
  }

  // Assign a trainer/TA to a course — only the college admin may do this.
  @Post(':id/trainers')
  @Roles('COLLEGE_ADMIN')
  assignTrainer(@Param('id') id: string, @Body() body: { user_id: string; role?: string }, @Req() req: any) {
    return this.coursesService.assignTrainer(id, body.user_id, body.role || 'PRIMARY_TRAINER', String(req.user?.id || ''));
  }

  @Get(':id/trainers')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  getTrainers(@Param('id') id: string) {
    return this.coursesService.getTrainers(id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT', 'GUEST_FACULTY')
  findAll(@Req() req: any, @Query('include_completed') includeCompleted?: string, @Query('count') count?: string) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    const viewer = {
      roles: req.user?.roles || [],
      userId: req.user?.id || '',
      includeCompleted: includeCompleted === '1' || includeCompleted === 'true',
    };
    // Lightweight count mode: the analytics/dashboard pages only need a number,
    // so don't ship the whole course list back to them (#perf).
    if (count === '1' || count === 'true') {
      return this.coursesService.countAll(tenantId, viewer);
    }
    // Pass the viewer (role + user id) so trainers/students get role-scoped lists
    // (courses they teach / courses they are enrolled in) instead of the whole tenant.
    // include_completed=1 keeps COMPLETED enrollments too (used by the grade card).
    return this.coursesService.findAll(tenantId, viewer);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT', 'GUEST_FACULTY')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('id') id: string, @Req() req: any) {
    const deletedBy = req.user?.id || req.user?.preferred_username || req.user?.username || null;
    return this.coursesService.remove(id, deletedBy);
  }
}
