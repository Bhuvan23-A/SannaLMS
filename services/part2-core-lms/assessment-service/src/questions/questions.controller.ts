import { Controller, Post, Get, Body, Req, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.questionsService.createQuestion(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.questionsService.getQuestions(String(tenantId), courseId);
  }
}
