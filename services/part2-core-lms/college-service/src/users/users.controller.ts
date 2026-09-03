import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard, Roles } from '../roles.guard';

@Controller('api/v1')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Bulk user import: creates Keycloak users + LMS user records (+ college links)
  @Post('users/bulk-import')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  bulkImport(@Body() body: any, @Req() req: any) {
    return this.usersService.bulkImport(body);
  }

  // List users for management screens + notification targeting.
  // Filters: ?college_id=&role=&tenant_id=&department=&branch=&year=
  @Get('users')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  listUsers(@Query() query: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    // College admins and trainers can only list users inside their own tenant.
    const tenantId = isSuperAdmin ? (query.tenant_id || undefined) : (req.user?.tenantId || query.tenant_id || undefined);
    return this.usersService.listUsers({
      college_id: query.college_id || undefined,
      role: query.role || undefined,
      tenant_id: tenantId,
      department: query.department || undefined,
      branch: query.branch || undefined,
      year: query.year || undefined,
    });
  }

  // Assign a college admin to an existing college (creates the Keycloak user if needed)
  @Post('colleges/:id/admin')
  @Roles('SUPER_ADMIN')
  async assignAdmin(@Param('id') id: string, @Body() body: any) {
    return this.usersService.assignCollegeAdminById(id, body);
  }

  // Self-service: change password for the currently authenticated user
  @Post('users/change-password')
  @Roles('STUDENT', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'COLLEGE_ADMIN', 'SUPER_ADMIN')
  changePassword(@Body() body: { current_password?: string; new_password?: string; password?: string }, @Req() req: any) {
    const newPass = body.new_password || body.password || '';
    const userId = req.user?.id || req.user?.sub;
    return this.usersService.changePassword(userId, newPass);
  }

  // Admin/Trainer action: reset any user's password
  @Post('users/:id/reset-password')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  resetUserPassword(@Param('id') id: string, @Body() body: { password?: string; new_password?: string }) {
    const newPass = body.new_password || body.password;
    return this.usersService.adminResetPassword(id, newPass);
  }

  // Student / User self-service password recovery (Forgot Password)
  @Post('users/forgot-password')
  forgotPassword(@Body() body: { email?: string; username?: string; identifier?: string; phone?: string; new_password?: string }) {
    return this.usersService.forgotPassword(body);
  }
}
