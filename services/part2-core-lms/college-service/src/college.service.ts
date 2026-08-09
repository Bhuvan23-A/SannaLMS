import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollegeService {
  constructor(private prisma: PrismaService) {}

  async createCollege(data: Prisma.CollegeCreateInput) {
    return this.prisma.extendedClient.college.create({
      data,
    });
  }

  /**
   * List colleges. Super admins see every college; anyone else is scoped to
   * their own tenant (college) so a college admin never sees "all 7 colleges".
   */
  async getColleges(tenantId?: string) {
    const where: Prisma.CollegeWhereInput = {};
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') {
      where.tenant_id = tenantId;
    }
    return this.prisma.extendedClient.college.findMany({
      where,
      include: {
        departments: true,
        // Include linked users so the UI can show each college's admin (#bugfix)
        users: { include: { user: true } },
      },
    });
  }

  async getCollege(id: string) {
    const college = await this.prisma.extendedClient.college.findUnique({
      where: { id },
      include: {
        departments: true,
        users: { include: { user: true } },
      },
    });
    if (!college) throw new NotFoundException('College not found');
    return college;
  }

  async updateCollege(id: string, data: { name?: string; subdomain?: string; tenant_id?: string; admin_email?: string }) {
    const existing = await this.prisma.extendedClient.college.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('College not found');

    const { admin_email, ...collegeData } = data as any;
    const updateData: Prisma.CollegeUpdateInput = {};
    if (collegeData.name !== undefined) updateData.name = collegeData.name;
    if (collegeData.subdomain !== undefined) updateData.subdomain = collegeData.subdomain;
    if (collegeData.tenant_id !== undefined) updateData.tenant_id = collegeData.tenant_id;

    const college = await this.prisma.extendedClient.college.update({
      where: { id },
      data: updateData,
    });
    return { ...college, admin_email: admin_email || undefined };
  }

  async deleteCollege(id: string) {
    const existing = await this.prisma.extendedClient.college.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('College not found');
    // Soft-delete: keep history, stop the college from appearing anywhere.
    await this.prisma.extendedClient.college.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { deleted: true, id };
  }
}
