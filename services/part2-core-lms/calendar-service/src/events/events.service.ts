import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  create(data: Record<string, any>, tenantId: string) {
    // Super admins may target specific colleges and/or broadcast with ['__ALL__'].
    // Non-super admins are restricted to their own college (empty targets).
    const isSuperAdmin = data['role'] === 'superadmin';
    const rawTargets: unknown = data['target_tenants'];
    let targetTenants: string[] = [];
    if (isSuperAdmin && Array.isArray(rawTargets)) {
      targetTenants = rawTargets.map(String).filter(Boolean);
    }
    return this.prisma.event.create({
      data: {
        title: String(data['title']),
        description: data['description'] ? String(data['description']) : null,
        start_time: new Date(String(data['start_time'])),
        end_time: new Date(String(data['end_time'])),
        event_type: data['event_type'] ? data['event_type'] as any : 'OTHER',
        course_id: data['course_id'] ? String(data['course_id']) : null,
        target_tenants: targetTenants,
        tenant_id: tenantId,
        created_by: data['user_id'] ? String(data['user_id']) : null,
      },
    });
  }

  findAll(tenantId: string, isSuperAdmin = false) {
    if (isSuperAdmin) {
      // Super admin sees everything: their own 'master' events + per-college events.
      return this.prisma.event.findMany({
        where: { deleted_at: null },
        orderBy: { start_time: 'asc' },
      });
    }
    // College user sees: own-tenant events + events explicitly targeted at this
    // college (target_tenants contains this tenantId or '__ALL__').
    return this.prisma.event.findMany({
      where: {
        deleted_at: null,
        OR: [
          { tenant_id: tenantId },
          { target_tenants: { has: tenantId } },
          { target_tenants: { has: '__ALL__' } },
        ],
      },
      orderBy: { start_time: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
    });
  }

  remove(id: string) {
    return this.prisma.event.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
