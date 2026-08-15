import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ForumsService {
  constructor(private prisma: PrismaService) {}

  async createForum(data: Record<string, any>, tenantId: string) {
    // Super admins may target specific colleges and/or broadcast with ['__ALL__'].
    // Non-super admins are restricted to their own college (empty targets).
    const isSuperAdmin = data['role'] === 'superadmin';
    const rawTargets: unknown = data['target_tenants'];
    let targetTenants: string[] = [];
    if (isSuperAdmin && Array.isArray(rawTargets)) {
      targetTenants = rawTargets.map(String).filter(Boolean);
    }
    return this.prisma.forum.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        target_tenants: targetTenants,
      }
    });
  }

  async getForum(id: string) {
    return this.prisma.forum.findUnique({ where: { id } });
  }

  // Close/reopen a forum. Scoped: super admin may manage any forum; everyone
  // else only forums owned by or targeted at their own college (#fix).
  async updateForum(id: string, data: Record<string, any>, tenantId: string, isSuperAdmin: boolean) {
    const forum = await this.prisma.forum.findUnique({ where: { id } });
    if (!forum) throw new NotFoundException('Forum not found');
    const canManage = isSuperAdmin || forum.tenant_id === tenantId || (forum.target_tenants || []).includes(tenantId);
    if (!canManage) {
      throw new ForbiddenException('You can only manage forums of your own college');
    }
    return this.prisma.forum.update({
      where: { id },
      data: {
        ...(data.is_locked !== undefined ? { is_locked: !!data.is_locked } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  }

  async getForums(tenantId: string, courseId?: string, isSuperAdmin = false) {
    if (isSuperAdmin) {
      return this.prisma.forum.findMany({
        where: {
          ...(courseId ? { course_id: courseId } : {})
        },
        orderBy: { created_at: 'desc' }
      });
    }
    return this.prisma.forum.findMany({
      where: {
        OR: [
          { tenant_id: tenantId },
          { target_tenants: { has: tenantId } },
          { target_tenants: { has: '__ALL__' } },
        ],
        ...(courseId ? { course_id: courseId } : {})
      },
      orderBy: { created_at: 'desc' }
    });
  }
}
