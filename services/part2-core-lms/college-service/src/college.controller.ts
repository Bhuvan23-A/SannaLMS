import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { CollegeService } from './college.service';
import { UsersService, DEFAULT_PASSWORD } from './users/users.service';
import { TenantPurgeService } from './tenant-purge.service';
import { Prisma } from '@prisma/client';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/colleges')
@UseGuards(RolesGuard)
export class CollegeController {
  constructor(
    private readonly collegeService: CollegeService,
    private readonly usersService: UsersService,
    private readonly purgeService: TenantPurgeService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN')
  async createCollege(@Body() createCollegeDto: Prisma.CollegeCreateInput & { admin_email?: string; admin_first_name?: string; admin_last_name?: string }) {
    const { admin_email, admin_first_name, admin_last_name, ...collegeData } = createCollegeDto as any;
    const college = await this.collegeService.createCollege(collegeData);

    // If the super admin supplied a college admin, create + link them right away
    let adminCredentials: { admin_username: string; admin_password: string } | null = null;
    if (admin_email) {
      try {
        const result = await this.usersService.assignCollegeAdmin(college, {
          email: admin_email,
          first_name: admin_first_name,
          last_name: admin_last_name,
        });
        // The default password is surfaced ONLY at creation time — the caller
        // (super admin) is the one person who is allowed to know it.
        adminCredentials = {
          admin_username: result.admin_username,
          admin_password: result.admin_password,
        };
      } catch (err: any) {
        // The college itself is created — surface admin creation as a warning, not a failure
        (college as any).admin_error = err?.message || 'Could not create college admin';
      }
    }
    return { ...college, admin_credentials: adminCredentials, default_password: DEFAULT_PASSWORD };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  async getColleges(@Req() req: any, @Query('count') count?: string) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? undefined : (req.user?.tenantId || undefined);
    // Lightweight count mode — the dashboard/analytics only need a number and
    // shouldn't download every college WITH all its users (#perf).
    if (count === '1' || count === 'true') {
      return this.collegeService.countColleges(tenantId, isSuperAdmin);
    }
    // Super admins see held colleges too (so they can restore / delete them).
    return this.collegeService.getColleges(tenantId, isSuperAdmin);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async getCollege(@Param('id') id: string) {
    return this.collegeService.getCollege(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  async updateCollege(@Param('id') id: string, @Body() body: any) {
    return this.collegeService.updateCollege(id, body);
  }

  /**
   * HOLD — soft delete + block all logins. Data is kept; Restore brings it back.
   */
  @Post(':id/hold')
  @Roles('SUPER_ADMIN')
  async holdCollege(@Param('id') id: string) {
    const college = await this.collegeService.getCollege(id, true);
    await this.collegeService.holdCollege(id);
    const users = await this.usersService.setTenantUsersEnabled(college.tenant_id || college.id, false);
    return { held: true, id, users_disabled: users };
  }

  /**
   * DELETE — permanent erasure. Revokes access, purges data from every service
   * database, removes local rows, then deletes the Keycloak identities.
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async deleteCollege(@Param('id') id: string) {
    const college = await this.collegeService.getCollege(id, true);
    const tenantId = college.tenant_id || college.id;

    // 1) Revoke access first so nobody can log in mid-purge.
    const disabled = await this.usersService.setTenantUsersEnabled(tenantId, false);

    // 2) Purge cross-service data (courses, assessments, attendance, ...).
    const purged = await this.purgeService.purgeTenant(tenantId);

    // 3) Permanently remove the Keycloak identities. This must run BEFORE the
    // local user rows are purged — deleteTenantUsers finds users via the LMS
    // user table, so purging local rows first would orphan the identities.
    const keycloak = await this.usersService.deleteTenantUsers(tenantId);

    // 4) Purge local college DB rows (org tree, users, roles, college).
    const local = await this.collegeService.purgeCollegeData(id, tenantId);

    return { deleted: true, id, tenant_id: tenantId, users_disabled: disabled, purged, local, keycloak };
  }

  /**
   * RESTORE — bring a held college back and re-enable its users' logins.
   */
  @Post(':id/restore')
  @Roles('SUPER_ADMIN')
  async restoreCollege(@Param('id') id: string) {
    const college = await this.collegeService.getCollege(id, true);
    await this.collegeService.restoreCollege(id);
    const users = await this.usersService.setTenantUsersEnabled(college.tenant_id || college.id, true);
    return { restored: true, id, users_enabled: users };
  }

  // Hand over (or recover) college-admin access: resets the Keycloak password
  // and returns the fresh credentials to the super admin.
  @Post(':id/admin/reset-password')
  @Roles('SUPER_ADMIN')
  async resetCollegeAdminPassword(@Param('id') id: string) {
    return this.usersService.resetCollegeAdminPassword(id);
  }
}
