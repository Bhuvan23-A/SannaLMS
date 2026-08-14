import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SectionService {
  constructor(private prisma: PrismaService) {}

  private whereFor(tenantId?: string) {
    return tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : {};
  }

  async create(data: any, tenantId: string) {
    if (!data.branch_id || !data.academic_session_id || !data.semester_number) {
      throw new BadRequestException('branch_id, academic_session_id and semester_number are required');
    }
    const semesterNumber = Math.trunc(Number(data.semester_number));
    if (!Number.isFinite(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
      throw new BadRequestException('semester_number must be 1..8');
    }
    // year_of_study is derived from the semester number when not given:
    // Sem 1-2 => year 1, Sem 3-4 => year 2, etc. (real college semantics).
    const yearOfStudy =
      data.year_of_study != null && data.year_of_study !== ''
        ? Math.trunc(Number(data.year_of_study))
        : Math.ceil(semesterNumber / 2);

    const sectionName = (data.name || '').trim();

    // Duplicate / restore handling (#fix): the unique key on
    // (tenant, branch, session, semester, name) still counts soft-deleted
    // rows, so re-adding a deleted section used to blow up with a raw 500
    // (P2002). If a row exists — deleted or not — restore it when it was
    // deleted, or tell the admin clearly that it already exists.
    const existing = await this.prisma.extendedClient.section.findFirst({
      where: {
        tenant_id: tenantId,
        branch_id: data.branch_id,
        academic_session_id: data.academic_session_id,
        semester_number: semesterNumber,
        name: sectionName,
      },
    });
    if (existing) {
      if (existing.deleted_at) {
        return this.prisma.extendedClient.section.update({
          where: { id: existing.id },
          data: { deleted_at: null, deleted_by: null },
        });
      }
      throw new BadRequestException(
        `Section "${sectionName || 'default'}" already exists for this branch, session and semester.`
      ); // 400 — the UI shows this message instead of "Internal server error"
    }

    return this.prisma.extendedClient.section.create({
      data: {
        tenant_id: tenantId,
        branch_id: data.branch_id,
        academic_session_id: data.academic_session_id,
        year_of_study: yearOfStudy,
        semester_number: semesterNumber,
        name: sectionName,
        created_by: data.created_by || null,
      },
    });
  }

  findAll(tenantId?: string, branchId?: string, sessionId?: string) {
    return this.prisma.extendedClient.section.findMany({
      where: {
        ...this.whereFor(tenantId),
        deleted_at: null,
        ...(branchId ? { branch_id: branchId } : {}),
        ...(sessionId ? { academic_session_id: sessionId } : {}),
      },
      orderBy: [{ branch_id: 'asc' }, { semester_number: 'asc' }, { name: 'asc' }],
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const section = await this.prisma.extendedClient.section.findFirst({
      where: { id, ...this.whereFor(tenantId) },
    });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.extendedClient.section.update({
      where: { id },
      data: {
        branch_id: data.branch_id ?? undefined,
        academic_session_id: data.academic_session_id ?? undefined,
        year_of_study: data.year_of_study != null && data.year_of_study !== '' ? Math.trunc(Number(data.year_of_study)) : undefined,
        semester_number: data.semester_number != null && data.semester_number !== '' ? Math.trunc(Number(data.semester_number)) : undefined,
        name: data.name !== undefined ? data.name.trim() : undefined,
      },
    });
  }

  // Soft delete — courses (offerings) may still reference the section, so the
  // historical record survives; the section just disappears from lists.
  async remove(id: string, tenantId: string) {
    const section = await this.prisma.extendedClient.section.findFirst({
      where: { id, ...this.whereFor(tenantId) },
    });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.extendedClient.section.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: 'admin' },
    });
  }
}
