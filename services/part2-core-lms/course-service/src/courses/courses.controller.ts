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
  findAll(@Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.coursesService.findAll(tenantId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT', 'GUEST_FACULTY')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
