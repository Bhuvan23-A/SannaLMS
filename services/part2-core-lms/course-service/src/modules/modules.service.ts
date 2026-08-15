import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  /** The tenant that owns this module — always the course's/subject's tenant,
   *  never the uploader's (a super admin building content for a college course
   *  would otherwise write it into tenant 'master' and the college would not
   *  see it). */
  async resolveTenant(data: any): Promise<string | null> {
    if (data.course_id) {
      const c = await this.prisma.extendedClient.course.findUnique({ where: { id: data.course_id }, select: { tenant_id: true } });
      if (c) return c.tenant_id;
    }
    if (data.subject_id) {
      const s = await this.prisma.extendedClient.subject.findUnique({ where: { id: data.subject_id }, select: { tenant_id: true } });
      if (s) return s.tenant_id;
    }
    return null;
  }

  /**
   * Create a module. The syllabus can be owned at two levels:
   * - subject level: subject_id only — the shared syllabus every offering reads
   * - offering level: course_id (+ subject_id recorded for linking)
   * At least one owner is required; a subject-only module needs no course yet.
   */
  async create(data: any, tenantId: string) {
    const courseId = data.course_id || null;
    const subjectId = data.subject_id || null;
    if (!courseId && !subjectId) {
      throw new NotFoundException('Provide a subject_id and/or course_id to create a module');
    }
    return this.prisma.extendedClient.module.create({
      data: {
        title: data.title,
        course_id: courseId,
        subject_id: subjectId,
        sequence_no: data.sequence_no || 1,
        tenant_id: tenantId,
      },
    });
  }

  /**
   * Read-path switch (phase 3): modules attached directly to the offering win;
   * when an offering has no modules of its own, fall back to the Subject-level
   * syllabus shared by every offering of that subject. Results are merged and
   * deduped so per-offering tweaks can layer on top of the shared syllabus.
   */
  async findAll(courseId: string) {
    const course = await this.prisma.extendedClient.course.findUnique({
      where: { id: courseId },
      select: { subject_id: true },
    });
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);

    const [courseModules, subjectModules] = await Promise.all([
      this.prisma.extendedClient.module.findMany({
        where: { course_id: courseId, deleted_at: null },
        include: { lessons: { where: { deleted_at: null }, include: { topics: { where: { deleted_at: null } } } } },
        orderBy: { sequence_no: 'asc' },
      }),
      course.subject_id
        ? this.prisma.extendedClient.module.findMany({
            where: { subject_id: course.subject_id, deleted_at: null },
            include: { lessons: { where: { deleted_at: null }, include: { topics: { where: { deleted_at: null } } } } },
            orderBy: { sequence_no: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    // Course-level wins on id collision; subject modules fill in the rest.
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const m of [...courseModules, ...subjectModules]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      merged.push(m);
    }
    return merged;
  }

  // Rename / reorder a module — the course builder drag-and-drop calls this
  // (it was silently 404ing because the route didn't exist) (#fix).
  async update(id: string, data: { title?: string; sequence_no?: number }) {
    const existing = await this.prisma.extendedClient.module.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Module ${id} not found`);
    return this.prisma.extendedClient.module.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.sequence_no !== undefined ? { sequence_no: data.sequence_no } : {}),
      },
    });
  }

  // Soft-delete a module (lessons/topics stay for audit; read paths filter
  // deleted_at so it disappears from the builder immediately).
  async remove(id: string) {
    const existing = await this.prisma.extendedClient.module.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Module ${id} not found`);
    return this.prisma.extendedClient.module.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
