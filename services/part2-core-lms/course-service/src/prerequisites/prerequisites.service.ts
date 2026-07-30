import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrerequisitesService {
  constructor(private prisma: PrismaService) {}

  create(data: { course_id: string, required_course_id: string }, tenantId: string) {
    return this.prisma.extendedClient.coursePrerequisite.create({
      data: {
        course_id: data.course_id,
        required_course_id: data.required_course_id,
        tenant_id: tenantId,
      }
    });
  }
}
