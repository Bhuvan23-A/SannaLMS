import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AcademicSessionService {
  constructor(private prisma: PrismaService) {}

  private whereFor(tenantId?: string) {
    return tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : {};
  }

  async create(data: any, tenantId: string) {
    const name = (data.name || '').trim();
    if (!name) throw new BadRequestException('name is required (e.g. "2026-27")');
    const status = data.status || (data.is_current ? 'ACTIVE' : 'PLANNED');

    // Exactly one ACTIVE / is_current session per tenant — activating a new one
    // deactivates the rest.
    if (status === 'ACTIVE' || data.is_current) {
      await this.prisma.extendedClient.academicSession.updateMany({
        where: { ...this.whereFor(tenantId), is_current: true },
        data: { is_current: false, status: 'PLANNED' },
      });
    }

    return this.prisma.extendedClient.academicSession.create({
      data: {
        name,
        tenant_id: tenantId,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        status,
        is_current: status === 'ACTIVE' || !!data.is_current,
        created_by: data.created_by || null,
      },
    });
  }

  findAll(tenantId?: string) {
    return this.prisma.extendedClient.academicSession.findMany({
      where: { ...this.whereFor(tenantId), deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async activate(id: string, tenantId: string) {
    const session = await this.prisma.extendedClient.academicSession.findFirst({
      where: { id, ...this.whereFor(tenantId) },
    });
    if (!session) throw new NotFoundException('Academic session not found');
    await this.prisma.extendedClient.academicSession.updateMany({
      where: { ...this.whereFor(tenantId), is_current: true, id: { not: id } },
      data: { is_current: false, status: 'PLANNED' },
    });
    return this.prisma.extendedClient.academicSession.update({
      where: { id },
      data: { status: 'ACTIVE', is_current: true },
    });
  }

  async close(id: string, tenantId: string) {
    const session = await this.prisma.extendedClient.academicSession.findFirst({
      where: { id, ...this.whereFor(tenantId) },
    });
    if (!session) throw new NotFoundException('Academic session not found');
    return this.prisma.extendedClient.academicSession.update({
      where: { id },
      data: { status: 'CLOSED', is_current: false },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const session = await this.prisma.extendedClient.academicSession.findFirst({
      where: { id, ...this.whereFor(tenantId) },
    });
    if (!session) throw new NotFoundException('Academic session not found');
    return this.prisma.extendedClient.academicSession.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        start_date: data.start_date !== undefined ? new Date(data.start_date) : undefined,
        end_date: data.end_date !== undefined ? new Date(data.end_date) : undefined,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const session = await this.prisma.extendedClient.academicSession.findFirst({
      where: { id, ...this.whereFor(tenantId) },
    });
    if (!session) throw new NotFoundException('Academic session not found');
    return this.prisma.extendedClient.academicSession.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: 'admin' },
    });
  }
}
