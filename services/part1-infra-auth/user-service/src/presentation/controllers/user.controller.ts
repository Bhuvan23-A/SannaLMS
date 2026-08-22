import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import type { CreateUserRequest } from '../../application/use-cases/create-user.use-case';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async createUser(@Body() request: CreateUserRequest) {
    try {
      const result = await this.createUserUseCase.execute(request);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return { success: true, data: { id, message: 'Not implemented yet' } };
  }

  @Post('activity/login')
  async recordLogin(@Body() body: { user_id: string; tenant_id?: string }) {
    try {
      await this.prisma.$executeRawUnsafe(
        'INSERT INTO "UserActivity" (user_id, tenant_id, last_login_at, last_active_at) VALUES ($1, $2, now(), now()) ON CONFLICT (user_id) DO UPDATE SET last_login_at = now(), last_active_at = now(), updated_at = now()',
        body.user_id, body.tenant_id || null
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('activity/heartbeat')
  async heartbeat(@Body() body: { user_id: string }) {
    try {
      await this.prisma.$executeRawUnsafe(
        'INSERT INTO "UserActivity" (user_id, last_active_at) VALUES ($1, now()) ON CONFLICT (user_id) DO UPDATE SET last_active_at = now(), updated_at = now()',
        body.user_id
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('activity/:userId')
  async getActivity(@Param('userId') userId: string) {
    try {
      const rows = await this.prisma.$queryRawUnsafe(
        'SELECT user_id, tenant_id, last_login_at, last_active_at FROM "UserActivity" WHERE user_id = $1 LIMIT 1',
        userId
      );
      return { success: true, data: Array.isArray(rows) ? rows[0] || null : null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('activity')
  async getAllActivity(@Req() req: Record<string, any>) {
    try {
      const tenantId = req.user?.tenantId || req.query?.tenant_id;
      let rows;
      if (tenantId) {
        rows = await this.prisma.$queryRawUnsafe(
          'SELECT user_id, tenant_id, last_login_at, last_active_at FROM "UserActivity" WHERE tenant_id = $1 ORDER BY last_active_at DESC NULLS LAST',
          tenantId
        );
      } else {
        rows = await this.prisma.$queryRawUnsafe(
          'SELECT user_id, tenant_id, last_login_at, last_active_at FROM "UserActivity" ORDER BY last_active_at DESC NULLS LAST'
        );
      }
      return { success: true, data: rows };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
