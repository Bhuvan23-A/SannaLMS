import { Controller, Post, Get, Param, Body, Req, Query, Put } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './roles.guard';

@Controller('api/v1/chat')
export class ChatController {
  constructor(private prisma: PrismaService) {}

  // ─── Direct Messages ──────────────────────────────────────
  @Post('dm')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async sendDM(@Body() body: any, @Req() req: any) {
    const fromUser = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.prisma.directMessage.create({
      data: {
        from_user: String(fromUser),
        to_user: body.to_user,
        content: body.content,
        file_url: body.file_url,
        tenant_id: String(tenantId),
      }
    });
  }

  @Get('dm/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async getConversation(@Param('userId') otherUser: string, @Req() req: any) {
    const me = req.user?.id || 'u-1';
    return this.prisma.directMessage.findMany({
      where: {
        OR: [
          { from_user: String(me), to_user: otherUser },
          { from_user: otherUser, to_user: String(me) },
        ]
      },
      orderBy: { created_at: 'asc' }
    });
  }

  @Put('dm/:id/read')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async markRead(@Param('id') id: string) {
    return this.prisma.directMessage.update({
      where: { id },
      data: { is_read: true, read_at: new Date() }
    });
  }

  // ─── Group Chat Rooms ─────────────────────────────────────
  @Post('rooms')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  async createRoom(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    const rawTargets: unknown = body.target_tenants;
    let targetTenants: string[] = [];
    if (isSuperAdmin && Array.isArray(rawTargets)) {
      targetTenants = rawTargets.map(String).filter(Boolean);
    }
    return this.prisma.chatRoom.create({
      data: {
        name: body.name,
        description: body.description,
        type: body.type || 'GROUP',
        course_id: body.course_id,
        created_by: String(userId),
        tenant_id: String(tenantId),
        target_tenants: targetTenants,
        members: {
          create: [{ user_id: String(userId), role: 'ADMIN' }]
        }
      },
      include: { members: true }
    });
  }

  @Get('rooms')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async getRooms(@Req() req: any) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    if (isSuperAdmin) {
      // Super admin sees all rooms (their own 'master' ones + any college's).
      return this.prisma.chatRoom.findMany({
        where: { members: { some: { user_id: String(userId) } } },
        include: { _count: { select: { members: true, messages: true } } }
      });
    }
    return this.prisma.chatRoom.findMany({
      where: {
        OR: [
          { tenant_id: String(tenantId) },
          { target_tenants: { has: String(tenantId) } },
          { target_tenants: { has: '__ALL__' } },
        ],
        members: { some: { user_id: String(userId) } }
      },
      include: { _count: { select: { members: true, messages: true } } }
    });
  }

  @Post('rooms/:id/join')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async joinRoom(@Param('id') roomId: string, @Req() req: any) {
    const userId = req.user?.id || 'u-1';
    return this.prisma.chatMember.upsert({
      where: { room_id_user_id: { room_id: roomId, user_id: String(userId) } },
      create: { room_id: roomId, user_id: String(userId), role: 'MEMBER' },
      update: {}
    });
  }

  @Post('rooms/:id/messages')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async sendMessage(@Param('id') roomId: string, @Body() body: any, @Req() req: any) {
    const userId = req.user?.id || 'u-1';
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.prisma.chatMessage.create({
      data: {
        room_id: roomId,
        user_id: String(userId),
        tenant_id: String(tenantId),
        content: body.content,
        file_url: body.file_url,
      }
    });
  }

  @Get('rooms/:id/messages')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async getMessages(@Param('id') roomId: string, @Query('limit') limit?: string) {
    return this.prisma.chatMessage.findMany({
      where: { room_id: roomId },
      orderBy: { created_at: 'asc' },
      take: limit ? parseInt(limit) : 50,
    });
  }
}
