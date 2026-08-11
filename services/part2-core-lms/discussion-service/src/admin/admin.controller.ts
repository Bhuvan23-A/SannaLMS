import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Roles } from '../roles.guard';

/**
 * Internal endpoint called by college-service during a college hard-delete.
 * Permanently removes every row belonging to a tenant from this service's DB.
 */
@Controller('api/v1/admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Post('purge-tenant')
  @Roles('SUPER_ADMIN')
  async purgeTenant(@Body() body: { tenant_id?: string }) {
    const tenantId = body?.tenant_id;
    if (!tenantId) throw new BadRequestException('tenant_id is required');

    const results: Record<string, number> = {};
    const del = async (model: any, key: string) => {
      try {
        const r = await model.deleteMany({ where: { tenant_id: tenantId } });
        results[key] = r.count;
      } catch {
        results[key] = -1;
      }
    };

    // Children before parents so FK constraints hold.
    await del(this.prisma.chatMessage, 'chatMessages');
    // ChatMember has no tenant_id column — scope via its chat room parent.
    try {
      const cm = await this.prisma.chatMember.deleteMany({
        where: { room: { tenant_id: tenantId } },
      });
      results.chatMembers = cm.count;
    } catch {
      results.chatMembers = -1;
    }
    await del(this.prisma.directMessage, 'directMessages');
    await del(this.prisma.post, 'posts');
    await del(this.prisma.thread, 'threads');
    await del(this.prisma.chatRoom, 'chatRooms');
    await del(this.prisma.forum, 'forums');

    return { tenant_id: tenantId, results };
  }
}
