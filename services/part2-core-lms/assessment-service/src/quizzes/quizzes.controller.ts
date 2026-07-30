import { Controller, Post, Get, Body, Req, Query, Param } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.quizzesService.createQuiz(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.quizzesService.getQuizzes(String(tenantId), courseId);
  }

  @Post(':id/submit')
  @Roles('STUDENT')
  submit(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    const userId = req.headers['x-mock-user-id'] || 'u-1';
    return this.quizzesService.submitQuiz(id, body.answers, String(userId), String(tenantId));
  }
}
