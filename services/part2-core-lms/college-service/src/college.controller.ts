import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CollegeService } from './college.service';
import { UsersService, DEFAULT_PASSWORD } from './users/users.service';
import { Prisma } from '@prisma/client';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/colleges')
@UseGuards(RolesGuard)
export class CollegeController {
  constructor(
    private readonly collegeService: CollegeService,
    private readonly usersService: UsersService,
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
  async getColleges(@Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? undefined : (req.user?.tenantId || undefined);
    return this.collegeService.getColleges(tenantId);
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

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async deleteCollege(@Param('id') id: string) {
    return this.collegeService.deleteCollege(id);
  }
}
