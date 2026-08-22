import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

// Internal course-service URL (Docker container name — matches the kong.yml
// sannalms-* convention). Overridable for local dev.
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'http://sannalms-course-service:3001';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * A student may only check in to sessions of courses they are enrolled in
   * (real-LMS rule). Verifies via course-service /enrollments/user/:id.
   * Fails OPEN on network/service errors (never blocks a check-in because of
   * an internal hiccup), but rejects a confirmed non-enrollment.
   */
  private async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${COURSE_SERVICE_URL}/api/v1/enrollments/user/${encodeURIComponent(userId)}`,
        { headers: { 'x-mock-roles': 'STUDENT' } }
      );
      if (!res.ok) {
        this.logger.warn(`Enrollment check failed (HTTP ${res.status}) — allowing check-in`);
        return true;
      }
      const enrollments = await res.json();
      const list = Array.isArray(enrollments) ? enrollments : [];
      return list.some((e: any) => e.course_id === courseId);
    } catch (err) {
      this.logger.warn(`Enrollment check error — allowing check-in: ${(err as Error).message}`);
      return true;
    }
  }

  // ─── Sessions ─────────────────────────────────────────────
  async createSession(data: Record<string, any>, tenantId: string) {
    return this.prisma.session.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        title: data.title,
        date: data.date ? new Date(data.date) : new Date(),
        location: data.location,
        lat: data.lat,
        lng: data.lng,
        radius_m: data.radius_m || data.radius_meters || 100,
        // Optional scheduled auto-close time; the session starts SCHEDULED
        // and only becomes check-in-able when the trainer starts it.
        end_time: data.end_time ? new Date(data.end_time) : null,
        status: 'SCHEDULED',
        // Auto-generate a QR token for every session
        qr_token: crypto.randomBytes(16).toString('hex'),
      }
    });
  }

  async getSessions(tenantId: string, courseId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { tenant_id: tenantId, course_id: courseId },
      orderBy: { date: 'desc' },
      include: { _count: { select: { records: true } } }
    });
    // Lazy auto-close: a session whose end_time has passed is treated (and
    // persisted) as ENDED so stale sessions never accept check-ins.
    const now = new Date();
    for (const s of sessions) {
      if (s.status === 'LIVE' && s.end_time && s.end_time <= now) {
        await this.prisma.session.update({
          where: { id: s.id },
          data: { status: 'ENDED', ended_at: now }
        });
        s.status = 'ENDED';
        s.ended_at = now;
      }
    }
    return sessions;
  }

  // Trainer starts the session — only from here can students check in.
  async startSession(sessionId: string, tenantId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    if (session.tenant_id !== tenantId && tenantId !== 'master') throw new Error('Session not found');
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'LIVE', started_at: new Date(), ended_at: null }
    });
  }

  // Trainer ends the session — attendance closes immediately.
  async endSession(sessionId: string, tenantId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    if (session.tenant_id !== tenantId && tenantId !== 'master') throw new Error('Session not found');
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ENDED', ended_at: new Date() }
    });
  }

  // A session is check-in-able only while LIVE (auto-closes once end_time passes).
  private async ensureLive(session: any): Promise<void> {
    if (session.end_time && session.end_time <= new Date()) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { status: 'ENDED', ended_at: new Date() }
      });
      throw new Error('This attendance session has ended. Ask your trainer to start a new one.');
    }
    if (session.status !== 'LIVE') {
      throw new Error(session.status === 'ENDED'
        ? 'This attendance session has ended. Ask your trainer to start a new one.'
        : 'Attendance session is not live yet. Wait for your trainer to start it.');
    }
  }

  // ─── Manual Attendance ───────────────────────────────────
  async markManual(sessionId: string, userId: string, status: string, tenantId: string) {
    return this.prisma.attendanceRecord.upsert({
      where: { session_id_user_id: { session_id: sessionId, user_id: userId } },
      create: { session_id: sessionId, user_id: userId, tenant_id: tenantId, status, method: 'MANUAL' },
      update: { status, method: 'MANUAL', check_in_at: new Date() }
    });
  }

  // ─── QR Attendance ───────────────────────────────────────
  async checkInByQR(qrToken: string, userId: string, tenantId: string) {
    const session = await this.prisma.session.findUnique({ where: { qr_token: qrToken } });
    if (!session) throw new Error('Invalid QR code or session not found');
    await this.ensureLive(session);
    if (!(await this.isEnrolled(userId, session.course_id))) {
      throw new Error('You are not enrolled in this course. Ask your college admin to add you.');
    }
    return this.prisma.attendanceRecord.upsert({
      where: { session_id_user_id: { session_id: session.id, user_id: userId } },
      create: { session_id: session.id, user_id: userId, tenant_id: tenantId, status: 'PRESENT', method: 'QR' },
      update: { status: 'PRESENT', method: 'QR', check_in_at: new Date() }
    });
  }

  // ─── GPS Attendance ──────────────────────────────────────
  async checkInByGPS(sessionId: string, userId: string, lat: number, lng: number, tenantId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    await this.ensureLive(session);

    // Haversine distance calculation
    const R = 6371000; // Earth radius in meters
    const phi1 = (session.lat ?? 0) * Math.PI / 180;
    const phi2 = lat * Math.PI / 180;
    const dPhi = (lat - (session.lat ?? 0)) * Math.PI / 180;
    const dLambda = (lng - (session.lng ?? 0)) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (dist > (session.radius_m ?? 100)) {
      throw new Error(`You are ${Math.round(dist)}m away. Must be within ${session.radius_m}m.`);
    }
    if (!(await this.isEnrolled(userId, session.course_id))) {
      throw new Error('You are not enrolled in this course. Ask your college admin to add you.');
    }

    return this.prisma.attendanceRecord.upsert({
      where: { session_id_user_id: { session_id: sessionId, user_id: userId } },
      create: { session_id: sessionId, user_id: userId, tenant_id: tenantId, status: 'PRESENT', method: 'GPS' },
      update: { status: 'PRESENT', method: 'GPS', check_in_at: new Date() }
    });
  }

  // ─── Live Class Auto Attendance ─────────────────────────
  async checkInByLive(sessionId: string, userId: string, tenantId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    await this.ensureLive(session);
    if (!(await this.isEnrolled(userId, session.course_id))) {
      throw new Error('You are not enrolled in this course.');
    }
    return this.prisma.attendanceRecord.upsert({
      where: { session_id_user_id: { session_id: sessionId, user_id: userId } },
      create: { session_id: sessionId, user_id: userId, tenant_id: tenantId, status: 'PRESENT', method: 'LIVECLASS' },
      update: { status: 'PRESENT', method: 'LIVECLASS', check_in_at: new Date() }
    });
  }

  // ─── Reports ─────────────────────────────────────────────
  async getSessionRecords(sessionId: string) {
    return this.prisma.attendanceRecord.findMany({ where: { session_id: sessionId } });
  }

  async getStudentAttendance(courseId: string, userId: string, tenantId: string) {
    const sessions = await this.prisma.session.findMany({ where: { tenant_id: tenantId, course_id: courseId } });
    const records = await this.prisma.attendanceRecord.findMany({
      where: { user_id: userId, session_id: { in: sessions.map(s => s.id) } }
    });
    const total = sessions.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    return {
      total_sessions: total,
      present: present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      records
    };
  }
}
