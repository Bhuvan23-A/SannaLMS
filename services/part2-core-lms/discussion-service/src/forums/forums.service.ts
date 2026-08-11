import { Injectable } from '@nestjs/common';
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
