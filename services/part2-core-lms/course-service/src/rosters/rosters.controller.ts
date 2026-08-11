import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { RostersService } from './rosters.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/rosters')
export class RostersController {
  constructor(private readonly rostersService: RostersService) {}

  private tenant(req: any): string {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    return isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
  }

  // Full student roster of a section (the class list).
  @Get(':sectionId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  listMembers(@Param('sectionId') sectionId: string, @Req() req: any) {
    return this.rostersService.listMembers(sectionId, this.tenant(req));
  }

  // Enroll students into a section (auto-enrolls them in all its offerings).
  @Post(':sectionId/members')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  addMembers(@Param('sectionId') sectionId: string, @Body() body: { user_ids?: string[] }, @Req() req: any) {
    const createdBy = req.user?.id || req.user?.preferred_username || null;
    return this.rostersService.addMembers(sectionId, body.user_ids || [], this.tenant(req), createdBy);
  }

  @Delete(':sectionId/members/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  removeMember(@Param('sectionId') sectionId: string, @Param('userId') userId: string, @Req() req: any) {
    return this.rostersService.removeMember(sectionId, userId, this.tenant(req));
  }
}
