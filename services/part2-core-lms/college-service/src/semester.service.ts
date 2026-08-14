import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SemesterService {
  constructor(private prisma: PrismaService) {}

  async createSemester(data: Prisma.SemesterCreateInput) {
    return this.prisma.extendedClient.semester.create({ data });
  }

  async getSemesters(tenantId?: string) {
    return this.prisma.extendedClient.semester.findMany({
      where: tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : undefined,
      include: { branch: true },
    });
  }

  /**
   * Update a semester. When the NAME changes, the numeric position
   * (semester_number) is kept in sync with the new name — renaming
   * "Semester 3" to "Semester 2" must not leave the timeline at 3 (#fix).
   * An explicit semester_number in the payload always wins; a name without a
   * digit keeps the current number.
   */
  async updateSemester(id: string, data: { name?: string; branch_id?: string; semester_number?: number }) {
    const existing = await this.prisma.extendedClient.semester.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Semester not found');

    let semesterNumber: number | undefined;
    if (data.semester_number !== undefined && data.semester_number !== null && String(data.semester_number) !== '') {
      semesterNumber = Math.trunc(Number(data.semester_number));
    } else if (data.name && data.name !== existing.name) {
      // Rename: re-derive from the new name (same rule the create modal uses).
      const m = /(\d+)/.exec(data.name);
      semesterNumber = m ? parseInt(m[1], 10) : (existing.semester_number ?? undefined);
    }

    return this.prisma.extendedClient.semester.update({
      where: { id },
      data: {
        name: data.name,
        branch_id: data.branch_id,
        ...(semesterNumber !== undefined ? { semester_number: semesterNumber } : {}),
      },
    });
  }

  async deleteSemester(id: string) {
    return this.prisma.extendedClient.semester.delete({ where: { id } });
  }
}
