import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(tenantId: string, branchId: string | null): Promise<string> {
    // Auto-generate "SUB-###" (per branch, else tenant-wide) when no code is given.
    const where: any = { tenant_id: tenantId, code: { startsWith: 'SUB-' }, deleted_at: null };
    if (branchId) where.branch_id = branchId;
    const count = await this.prisma.extendedClient.subject.count({ where });
    return `SUB-${String(count + 1).padStart(3, '0')}`;
  }

  async create(data: any, tenantId: string) {
    const name = (data.name || '').trim();
    if (!name) throw new BadRequestException('name is required');
    const branchId = data.branch_id || null;
    let code = (data.code || '').trim().toUpperCase();
    if (!code) code = await this.nextCode(tenantId, branchId);

    // Keep codes unique per (tenant, branch) — surface a friendly error instead
    // of a Prisma P2002. Use findFirst, not findUnique: findUnique throws a
    // PrismaClientValidationError when branch_id is null (NULL is never equal
    // to NULL in a unique index, so an explicit "no branch" subject is valid).
    const clash = await this.prisma.extendedClient.subject.findFirst({
      where: { tenant_id: tenantId, branch_id: branchId, code, deleted_at: null },
    });
    if (clash) throw new BadRequestException(`Subject code ${code} already exists for this branch`);

    const credits = data.credits != null && data.credits !== '' ? Math.trunc(Number(data.credits)) : 3;
    if (!Number.isFinite(credits) || credits < 1 || credits > 12) {
      throw new BadRequestException('credits must be between 1 and 12');
    }

    return this.prisma.extendedClient.subject.create({
      data: {
        tenant_id: tenantId,
        code,
        name,
        description: data.description?.trim() || null,
        department_id: data.department_id || null,
        branch_id: branchId,
        credits,
        lt_p: data.lt_p?.trim() || null,
        status: data.status || CourseStatus.DRAFT,
        created_by: data.created_by || null,
      },
    });
  }

  findAll(tenantId?: string, branchId?: string, includeArchived = false) {
    const where: any = {};
    if (!includeArchived) where.deleted_at = null;
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') where.tenant_id = tenantId;
    if (branchId) where.branch_id = branchId;
    return this.prisma.extendedClient.subject.findMany({
      where,
      orderBy: [{ deleted_at: 'asc' }, { branch_id: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string, tenantId?: string) {
    const where: any = { id, deleted_at: null };
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') where.tenant_id = tenantId;
    const subject = await this.prisma.extendedClient.subject.findFirst({ where });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async update(id: string, tenantId: string, data: any) {
    const subject = await this.findOne(id, tenantId);
    return this.prisma.extendedClient.subject.update({
      where: { id },
      data: {
        code: data.code !== undefined ? data.code.trim().toUpperCase() : undefined,
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description?.trim() || null : undefined,
        department_id: data.department_id !== undefined ? data.department_id || null : undefined,
        branch_id: data.branch_id !== undefined ? data.branch_id || null : undefined,
        credits: data.credits !== undefined && data.credits !== '' ? Math.trunc(Number(data.credits)) : undefined,
        lt_p: data.lt_p !== undefined ? data.lt_p?.trim() || null : undefined,
        status: data.status !== undefined ? data.status : undefined,
        updated_by: data.updated_by || subject.updated_by,
      },
    });
  }

  // Soft delete — offerings (courses) may reference the subject, so history stays.
  async remove(id: string, tenantId: string) {
    const subject = await this.findOne(id, tenantId);
    return this.prisma.extendedClient.subject.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: 'admin', status: CourseStatus.ARCHIVED },
    });
  }

  // Find a subject in ANY state (including archived) — used by restore and
  // permanent delete, which must be able to reach archived rows.
  private async findAny(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') where.tenant_id = tenantId;
    const subject = await this.prisma.extendedClient.subject.findFirst({ where });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  // Un-archive: bring an archived subject back into the active catalog.
  async restore(id: string, tenantId: string) {
    const subject = await this.findAny(id, tenantId);
    return this.prisma.extendedClient.subject.update({
      where: { id },
      data: { deleted_at: null, deleted_by: null, status: CourseStatus.DRAFT },
    });
  }

  // Hard delete: remove the subject AND its subject-owned syllabus tree. Blocked
  // with a friendly error when course offerings still reference the subject.
  async removePermanent(id: string, tenantId: string) {
    const subject = await this.findAny(id, tenantId);
    const offeringCount = await this.prisma.extendedClient.course.count({ where: { subject_id: id } });
    if (offeringCount > 0) {
      throw new BadRequestException(
        `This subject is used by ${offeringCount} course offering(s). Archive it instead, or delete those offerings first.`,
      );
    }

    // Cascade the subject-owned syllabus: modules → lessons → topics → assets/progress.
    const modules = await this.prisma.extendedClient.module.findMany({ where: { subject_id: id }, select: { id: true } });
    for (const m of modules) {
      const lessons = await this.prisma.extendedClient.lesson.findMany({ where: { module_id: m.id }, select: { id: true } });
      for (const l of lessons) {
        const topics = await this.prisma.extendedClient.topic.findMany({ where: { lesson_id: l.id }, select: { id: true } });
        const topicIds = topics.map((t: any) => t.id);
        if (topicIds.length) {
          const assets = await this.prisma.extendedClient.assetMetadata.findMany({
            where: { topic_id: { in: topicIds } }, select: { id: true },
          });
          const assetIds = assets.map((a: any) => a.id);
          if (assetIds.length) {
            await this.prisma.extendedClient.videoMetadata.deleteMany({ where: { asset_id: { in: assetIds } } }).catch(() => {});
            await this.prisma.extendedClient.assetMetadata.deleteMany({ where: { topic_id: { in: topicIds } } }).catch(() => {});
          }
          await this.prisma.extendedClient.topicProgress.deleteMany({ where: { topic_id: { in: topicIds } } }).catch(() => {});
          await this.prisma.extendedClient.topic.deleteMany({ where: { lesson_id: l.id } });
        }
        await this.prisma.extendedClient.lesson.delete({ where: { id: l.id } });
      }
      await this.prisma.extendedClient.module.delete({ where: { id: m.id } });
    }

    await this.prisma.extendedClient.subject.delete({ where: { id } });
    return { deleted: true, id };
  }

  /**
   * Subject-owned syllabus (phase 5): the module→lesson→topic tree that every
   * offering of this subject shares. Editing the syllabus here updates all
   * sections/batches that run the subject.
   */
  async getSyllabus(id: string, tenantId?: string) {
    const subject = await this.findOne(id, tenantId);
    const modules = await this.prisma.extendedClient.module.findMany({
      where: { subject_id: subject.id, deleted_at: null },
      include: {
        lessons: {
          where: { deleted_at: null },
          include: { topics: { where: { deleted_at: null } } },
          orderBy: { sequence_no: 'asc' },
        },
      },
      orderBy: { sequence_no: 'asc' },
    });
    return { subject, modules };
  }
}
