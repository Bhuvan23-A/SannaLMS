import { Controller, Post, Get, Body, Req, Query, Param, Put } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.assignmentsService.createAssignment(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.assignmentsService.getAssignments(String(tenantId), courseId);
  }

  @Post(':id/submit')
  @Roles('STUDENT')
  submit(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    const userId = req.headers['x-mock-user-id'] || 'u-1';
    return this.assignmentsService.submitAssignment(id, body, String(userId), String(tenantId));
  }

  @Put('submissions/:id/grade')
  @Roles('PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  grade(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.assignmentsService.gradeAssignment(id, body.score, body.feedback);
  }
}
