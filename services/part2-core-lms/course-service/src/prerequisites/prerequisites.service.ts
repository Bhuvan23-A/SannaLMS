import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrerequisitesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { course_id: string, required_course_id: string }, tenantId: string) {
    // Resolve the tenant from the course itself when the client didn't send one.
    let effectiveTenant = tenantId;
    if (!effectiveTenant || effectiveTenant === 'test-tenant' || effectiveTenant === 'master') {
      const course = await this.prisma.extendedClient.course.findUnique({ where: { id: data.course_id } });
      effectiveTenant = course?.tenant_id || 'test-tenant';
    }

    return this.prisma.extendedClient.coursePrerequisite.create({
      data: {
        course_id: data.course_id,
        required_course_id: data.required_course_id,
        tenant_id: effectiveTenant,
      }
    });
  }
}
