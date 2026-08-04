import { Controller, Post, Get, Body, Req, Param, Put } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.threadsService.createThread(body, String(userId), String(tenantId));
  }

  @Get('forum/:forumId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Param('forumId') forumId: string) {
    return this.threadsService.getThreads(forumId);
  }

  @Post(':threadId/posts')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  createPost(@Param('threadId') threadId: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.threadsService.createPost(threadId, body, String(userId), String(tenantId));
  }

  @Get(':threadId/posts')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  getPosts(@Param('threadId') threadId: string) {
    return this.threadsService.getPosts(threadId);
  }

  @Put(':postId/read')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  markRead(@Param('postId') postId: string, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    return this.threadsService.markPostRead(postId, String(userId));
  }

  @Put(':threadId/solve')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  markSolved(@Param('threadId') threadId: string) {
    return this.threadsService.markSolved(threadId);
  }
}
