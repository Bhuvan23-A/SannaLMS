import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LiveclassService {
  constructor(private prisma: PrismaService) {}

  async createClass(data: Record<string, any>, tenantId: string, hostUserId: string) {
    // Generate a unique, URL-safe room name for Jitsi
    const roomName = `lms-${crypto.randomBytes(8).toString('hex')}`;
    return this.prisma.liveClass.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        host_user_id: hostUserId,
        room_name: roomName,
        scheduled_at: new Date(data.scheduled_at),
        duration_mins: data.duration_mins || 60,
      }
    });
  }

  async getClasses(tenantId: string, courseId: string) {
    const filter: Record<string, any> = { course_id: courseId };
    if (tenantId !== 'master') {
      filter.tenant_id = tenantId;
    }
    return this.prisma.liveClass.findMany({
      where: filter,
      orderBy: { scheduled_at: 'asc' }
    });
  }

  async startClass(id: string) {
    const cls = await this.prisma.liveClass.findUnique({ where: { id } });
    if (!cls) throw new Error('Class not found');
    // A class that was already ended cannot be re-started — it would otherwise
    // flip back to "Go Live" in the UI after ending (#bugfix).
    if (cls.ended_at) throw new Error('This class has already ended and cannot be restarted');
    return this.prisma.liveClass.update({
      where: { id },
      data: { is_live: true, ended_at: null }
    });
  }

  async endClass(id: string, recordingUrl?: string) {
    return this.prisma.liveClass.update({
      where: { id },
      data: { is_live: false, ended_at: new Date(), recording_url: recordingUrl }
    });
  }

  async getJitsiToken(classId: string, userId: string) {
    // In production this would sign a JWT for Jitsi's JWT auth.
    // For now we return a mock token with the room info.
    const cls = await this.prisma.liveClass.findUnique({ where: { id: classId } });
    if (!cls) throw new Error('Class not found');
    return {
      room_name: cls.room_name,
      jitsi_url: `https://meet.jit.si/${cls.room_name}`,
      is_host: cls.host_user_id === userId,
      // In production: sign a JWT here with app_id + secret
      token: null,
    };
  }
}
