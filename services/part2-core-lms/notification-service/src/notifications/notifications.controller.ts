import { Controller, Get, Post, Body, Param, Put, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  send(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const callerRoles: string[] = req.user?.roles || [];
    return this.notificationsService.enqueueNotification(body, String(tenantId), callerRoles);
  }

  @Get('preferences')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  getPreferences(@Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.notificationsService.getPreferences(String(userId), String(tenantId));
  }

  @Put('preferences')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  updatePreferences(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.notificationsService.updatePreferences(String(userId), String(tenantId), body);
  }

  @Get('history')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  getHistory(@Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    return this.notificationsService.getHistory(String(userId));
  }

  @Put(':id/read')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  markAsRead(@Param('id') id: string, @Req() req: Record<string, any>) {
    const userId = req.user?.id || 'u-1';
    return this.notificationsService.markAsRead(id, String(userId));
  }
}
