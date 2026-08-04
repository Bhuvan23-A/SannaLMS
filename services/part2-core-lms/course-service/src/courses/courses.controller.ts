import { Controller, Get, Post, Body, Param, Req, Delete } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() createCourseDto: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (createCourseDto.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.coursesService.create(createCourseDto, String(tenantId));
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
