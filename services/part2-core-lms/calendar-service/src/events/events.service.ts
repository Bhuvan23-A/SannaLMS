import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  create(data: Record<string, any>, tenantId: string) {
    return this.prisma.event.create({
      data: {
        title: String(data['title']),
        description: data['description'] ? String(data['description']) : null,
        start_time: new Date(String(data['start_time'])),
        end_time: new Date(String(data['end_time'])),
        event_type: data['event_type'] ? data['event_type'] as any : 'OTHER',
        course_id: data['course_id'] ? String(data['course_id']) : null,
        tenant_id: tenantId,
        created_by: data['user_id'] ? String(data['user_id']) : null,
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.event.findMany({
      where: { tenant_id: tenantId },
      orderBy: { start_time: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
    });
  }

  remove(id: string) {
    return this.prisma.event.delete({
      where: { id },
    });
  }
}
