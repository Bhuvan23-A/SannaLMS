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
   * List colleges. Super admins see every college (including held ones, so
   * they can restore or permanently delete them); anyone else is scoped to
   * their own tenant (college) and only sees active colleges. Each college
   * carries a `status` ('ACTIVE' | 'HELD') for the UI.
   */
  async getColleges(tenantId?: string, includeHeld = false) {
    const where: Prisma.CollegeWhereInput = {};
    if (!includeHeld) where.deleted_at = null; // held colleges hidden for non-super admins
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') {
      where.tenant_id = tenantId;
    }
    const colleges = await this.prisma.extendedClient.college.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        departments: true,
        // Include linked users so the UI can show each college's admin (#bugfix)
        users: { include: { user: true } },
      },
    });
    return colleges.map((c: any) => ({ ...c, status: c.deleted_at ? 'HELD' : 'ACTIVE' }));
  }

  // Lightweight count for dashboards — avoids the heavy users relation (#perf).
  async countColleges(tenantId?: string, includeHeld = false) {
    const where: Prisma.CollegeWhereInput = {};
    if (!includeHeld) where.deleted_at = null;
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') {
      where.tenant_id = tenantId;
    }
    const count = await this.prisma.extendedClient.college.count({ where });
    return { count };
  }

  async getCollege(id: string, includeHeld = false) {
    const college = await this.prisma.extendedClient.college.findFirst({
      where: { id, ...(includeHeld ? {} : { deleted_at: null }) },
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

  /**
   * HOLD — soft delete: hide the college everywhere but keep every row so it
   * can be restored. The caller additionally disables the tenant's Keycloak
   * users so nobody can log in while held.
   */
  async holdCollege(id: string) {
    const existing = await this.prisma.extendedClient.college.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('College not found');
    if (existing.deleted_at) throw new NotFoundException('College is already held');
    await this.prisma.extendedClient.college.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { held: true, id };
  }

  /**
   * Restore a held college: clear the soft-delete flag so it shows up again.
   * The caller re-enables the tenant's Keycloak users.
   */
  async restoreCollege(id: string) {
    const existing = await this.prisma.extendedClient.college.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('College not found');
    await this.prisma.extendedClient.college.update({
      where: { id },
      data: { deleted_at: null },
    });
    return { restored: true, id };
  }

  /**
   * HARD DELETE — permanently remove the college and every local row in the
   * college DB (user roles, semesters, branches, departments, users). Cross-
   * service data (courses, grades, attendance, ...) is purged beforehand by
   * the controller via each service's /api/v1/admin/purge-tenant endpoint, and
   * Keycloak identities are deleted last by the controller.
   */
  async purgeCollegeData(id: string, tenantId: string) {
    const results: Record<string, number> = {};
    const del = async (model: any, key: string) => {
      try {
        const r = await model.deleteMany({ where: { tenant_id: tenantId } });
        results[key] = r.count;
      } catch (err) {
        results[key] = -1; // FK error or missing column — reported, not fatal
      }
    };

    // Children before parents so FK constraints hold.
    await this.prisma.extendedClient.userRole.deleteMany({
      where: { OR: [{ tenant_id: tenantId }, { college_id: id }] },
    }).then((r: any) => (results.userRoles = r.count)).catch(() => (results.userRoles = -1));
    await del(this.prisma.extendedClient.semester, 'semesters');
    await del(this.prisma.extendedClient.branch, 'branches');
    await del(this.prisma.extendedClient.department, 'departments');

    // Users: delete only those with no remaining roles anywhere (a user could
    // theoretically be shared across colleges — leave those alone).
    const tenantUsers = await this.prisma.extendedClient.user.findMany({ where: { tenant_id: tenantId } });
    let usersDeleted = 0;
    for (const u of tenantUsers) {
      const remaining = await this.prisma.extendedClient.userRole.count({ where: { user_id: u.id } });
      if (remaining === 0) {
        await this.prisma.extendedClient.user.delete({ where: { id: u.id } }).catch(() => {});
        usersDeleted++;
      }
    }
    results.users = usersDeleted;

    await this.prisma.extendedClient.college.delete({ where: { id } }).catch(() => {});
    results.college = 1;
    return { tenant_id: tenantId, results };
  }
}
