import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  create(data: any, tenantId: string) {
    return this.prisma.extendedClient.module.create({
      data: {
        title: data.title,
        course_id: data.course_id,
        sequence_no: data.sequence_no || 1,
        tenant_id: tenantId,
      },
    });
  }

  findAll(courseId: string) {
    return this.prisma.extendedClient.module.findMany({
      where: { course_id: courseId }
    });
  }
}
