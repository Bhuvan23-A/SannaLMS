import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EnrollmentStatus, MembershipStatus } from '@prisma/client';

@Injectable()
export class RostersService {
  constructor(private prisma: PrismaService) {}

  private async getSectionCourses(tenantId: string, sectionId: string): Promise<any[]> {
    return this.prisma.extendedClient.course.findMany({
      where: { tenant_id: tenantId, section_id: sectionId, deleted_at: null },
      select: { id: true, title: true },
    });
  }

  async listMembers(sectionId: string, tenantId: string) {
    const where: any = { section_id: sectionId, deleted_at: null };
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant') where.tenant_id = tenantId;
    return this.prisma.extendedClient.sectionMembership.findMany({
      where,
      orderBy: { enrolled_at: 'asc' },
    });
  }

  /**
   * Enroll students into a section (the roster) AND auto-enroll each of them in
   * every offering (course) currently running for that section — real-college
   * "admit to the class" semantics. Existing memberships/enrollments are kept.
   */
  async addMembers(sectionId: string, userIds: string[], tenantId: string, createdBy?: string) {
    const ids = (userIds || []).filter(Boolean);
    if (ids.length === 0) throw new BadRequestException('Provide at least one user_id');

    const courses = await this.getSectionCourses(tenantId, sectionId);
    let memberships = 0;
    let enrollments = 0;
    let skipped = 0;

    for (const userId of ids) {
      const existingMember = await this.prisma.extendedClient.sectionMembership.findUnique({
        where: { section_id_user_id: { section_id: sectionId, user_id: userId } },
      });
      if (!existingMember) {
        await this.prisma.extendedClient.sectionMembership.create({
          data: { tenant_id: tenantId, section_id: sectionId, user_id: userId, created_by: createdBy || null },
        });
        memberships += 1;
      }

      // Auto-enroll in every active offering of this section.
      for (const course of courses) {
        const existing = await this.prisma.extendedClient.enrollment.findUnique({
          where: { user_id_course_id: { user_id: userId, course_id: course.id } },
        });
        if (existing) { skipped += 1; continue; }
        await this.prisma.extendedClient.enrollment.create({
          data: {
            user_id: userId,
            course_id: course.id,
            tenant_id: tenantId,
            auto_enrolled: true,
            section_id: sectionId,
          },
        });
        enrollments += 1;
      }
    }

    return { section_id: sectionId, memberships, enrollments, skipped, users: ids.length };
  }

  /** Remove a student from the section roster. Existing course enrollments are
   *  kept (they are the academic record); only the membership row is retired. */
  async removeMember(sectionId: string, userId: string, tenantId: string) {
    const member = await this.prisma.extendedClient.sectionMembership.findFirst({
      where: { section_id: sectionId, user_id: userId, deleted_at: null },
    });
    if (!member) throw new NotFoundException('Membership not found');
    return this.prisma.extendedClient.sectionMembership.update({
      where: { id: member.id },
      data: { deleted_at: new Date(), status: MembershipStatus.DROPPED, deleted_by: 'admin' },
    });
  }
}
