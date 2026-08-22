import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface NotificationTarget {
  type: 'ALL' | 'COLLEGE' | 'DEPARTMENT' | 'BRANCH' | 'SEMESTER' | 'COURSE' | 'ROLE' | 'USER';
  college_id?: string;
  department?: string;   // department NAME (Keycloak attribute from bulk import)
  branch?: string;       // branch NAME
  semester_id?: string;  // semester ID (resolved to its branch's users)
  course_id?: string;
  role?: string;         // student | professor | teaching_assistant | college_admin ...
  user_ids?: string[];
  tenant_id?: string;
}

// Internal service URLs (Docker container names — matches kong.yml's
// sannalms-* convention). Overridable for local dev.
const COLLEGE_SERVICE_URL = process.env.COLLEGE_SERVICE_URL || 'http://sannalms-college-service:3000';
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'http://sannalms-course-service:3001';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Resolve a targeting descriptor into concrete user IDs.
   * Delegates to college-service (/api/v1/users) and course-service
   * (/enrollments/course/:id, /courses/:id/trainers) over internal HTTP.
   */
  async resolveTarget(target: NotificationTarget | undefined, callerTenantId: string, isSuperAdmin: boolean): Promise<string[]> {
    if (!target || !target.type) return [];

    // Super admins may target any college — no tenant filter. Everyone else is
    // locked to their own tenant so they can't reach outside their college.
    const tenantParam = isSuperAdmin ? '' : `&tenant_id=${encodeURIComponent(callerTenantId)}`;
    const usersUrl = (query: string) => `${COLLEGE_SERVICE_URL}/api/v1/users?${query}`;

    // Internal service-to-service calls pass the mock role header (the same
    // mechanism the frontend uses when no JWT is attached) so RolesGuard lets us
    // through. In production this would be a service-account token.
    const MOCK_AUTH_HEADERS = { 'x-mock-roles': 'SUPER_ADMIN' };

    const fetchIds = async (url: string): Promise<string[]> => {
      try {
        const res = await fetch(url, { headers: MOCK_AUTH_HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map((u: any) => u.user_id || u.id).filter(Boolean);
      } catch (err) {
        this.logger.warn(`Target resolution failed for ${url}: ${(err as Error).message}`);
        return [];
      }
    };

    switch (target.type) {
      case 'USER':
        return Array.isArray(target.user_ids) ? target.user_ids.filter(Boolean) : [];

      case 'ALL':
        return fetchIds(usersUrl(`role=student${tenantParam}`));

      case 'COLLEGE':
        return fetchIds(usersUrl(`college_id=${encodeURIComponent(target.college_id || '')}${tenantParam}`));

      case 'DEPARTMENT':
        return fetchIds(usersUrl(`department=${encodeURIComponent(target.department || '')}&college_id=${encodeURIComponent(target.college_id || '')}${tenantParam}`));

      case 'BRANCH':
        return fetchIds(usersUrl(`branch=${encodeURIComponent(target.branch || '')}&college_id=${encodeURIComponent(target.college_id || '')}${tenantParam}`));

      case 'SEMESTER': {
        // Resolve semester -> branch name, then the branch's users.
        try {
          const semRes = await fetch(`${COLLEGE_SERVICE_URL}/api/v1/semesters`, { headers: MOCK_AUTH_HEADERS });
          const sems = semRes.ok ? await semRes.json() : [];
          const sem = (Array.isArray(sems) ? sems : []).find((s: any) => s.id === target.semester_id);
          if (!sem) return [];
          const brRes = await fetch(`${COLLEGE_SERVICE_URL}/api/v1/branches`, { headers: MOCK_AUTH_HEADERS });
          const branches = brRes.ok ? await brRes.json() : [];
          const branch = (Array.isArray(branches) ? branches : []).find((b: any) => b.id === sem.branch_id);
          return fetchIds(usersUrl(`branch=${encodeURIComponent(branch?.name || '')}&college_id=${encodeURIComponent(target.college_id || '')}${tenantParam}`));
        } catch (err) {
          this.logger.warn(`Semester target resolution failed: ${(err as Error).message}`);
          return [];
        }
      }

      case 'COURSE': {
        // Students enrolled in the course + trainers assigned to it.
        const students = await fetchIds(`${COURSE_SERVICE_URL}/api/v1/enrollments/course/${encodeURIComponent(target.course_id || '')}`);
        const trainers = await fetchIds(`${COURSE_SERVICE_URL}/api/v1/courses/${encodeURIComponent(target.course_id || '')}/trainers`);
        return [...new Set([...students, ...trainers])];
      }

      case 'ROLE':
        return fetchIds(usersUrl(`role=${encodeURIComponent(target.role || 'student')}&college_id=${encodeURIComponent(target.college_id || '')}${tenantParam}`));

      default:
        return [];
    }
  }

  async enqueueNotification(data: Record<string, any>, tenantId: string, callerRoles: string[] = [], senderId?: string) {
    const target: NotificationTarget | undefined = data['target'] || (data['user_id'] ? { type: 'USER', user_ids: [data['user_id']] } : undefined);

    if (!target || !target.type) {
      throw new BadRequestException('A target (or user_id) is required to send a notification.');
    }

    // Role-based target restrictions:
    //   Super admin:        college / department / branch / semester / course / role / user
    //   College admin:      department / branch / semester / course / role / user (own college)
    //   Primary trainer/TA: course / user only
    const isSuperAdmin = callerRoles.some(r => ['superadmin', 'SUPER_ADMIN'].includes(r));
    const isCollegeAdmin = callerRoles.some(r => ['tenantadmin', 'COLLEGE_ADMIN'].includes(r));
    if (!isSuperAdmin && !isCollegeAdmin && !['COURSE', 'USER'].includes(target.type)) {
      throw new BadRequestException('Trainers can only send notifications to a course or specific students.');
    }
    if (isCollegeAdmin && ['COLLEGE'].includes(target.type)) {
      throw new BadRequestException('College admins cannot target whole colleges — use department, branch or semester.');
    }

    const userIds = await this.resolveTarget(target, tenantId, isSuperAdmin);
    if (userIds.length === 0) {
      throw new BadRequestException('The target resolved to no users. Check the selected college/department/course or role.');
    }

    // Resolve channels per user preference
    const created: any[] = [];
    for (const userId of userIds) {
      const prefs = await this.getPreferences(userId, tenantId);
      const channels: string[] = [];
      const requested = data['channels'] || ['WEB'];
      if (prefs.email && requested.includes('EMAIL')) channels.push('EMAIL');
      if (prefs.sms && requested.includes('SMS')) channels.push('SMS');
      if (prefs.push && requested.includes('PUSH')) channels.push('PUSH');
      if (prefs.web && requested.includes('WEB')) channels.push('WEB');
      if (channels.length === 0) channels.push('WEB');

      for (const channel of channels) {
        created.push(await this.prisma.notification.create({
          data: {
            user_id: userId,
            tenant_id: tenantId,
            sender_id: senderId || null,
            type: String(data['type'] || 'SYSTEM'),
            title: String(data['title']),
            body: String(data['body']),
            channel,
          },
        }));
      }
    }

    return { sent: created.length, recipients: userIds.length, created };
  }

  async getPreferences(userId: string, tenantId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { user_id: userId }
    });
    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { user_id: userId, tenant_id: tenantId }
      });
    }
    return prefs;
  }

  async updatePreferences(userId: string, tenantId: string, updates: Record<string, any>) {
    return this.prisma.notificationPreference.upsert({
      where: { user_id: userId },
      update: {
        email: updates['email'],
        sms: updates['sms'],
        push: updates['push'],
        web: updates['web']
      },
      create: {
        user_id: userId,
        tenant_id: tenantId,
        email: updates['email'] ?? true,
        sms: updates['sms'] ?? false,
        push: updates['push'] ?? true,
        web: updates['web'] ?? true,
      }
    });
  }

  async getHistory(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50
    });
  }

  // Notifications the caller SENT (staff outbox). Previously the admin
  // "history" panel only returned notifications addressed to the caller, so a
  // super admin who sent a notification never saw it appear anywhere (#fix).
  async getSentHistory(userId: string) {
    return this.prisma.notification.findMany({
      where: { sender_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, user_id: userId },
      data: { read: true }
    });
  }

  // Background processor
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    const pending = await this.prisma.notification.findMany({
      where: { status: 'PENDING', retry_count: { lt: 3 } },
      take: 20
    });

    if (pending.length > 0) {
      this.logger.log(`Processing ${pending.length} pending notifications...`);
    }

    for (const notif of pending) {
      try {
        // Simulate delivery latency
        await new Promise(r => setTimeout(r, 50));

        // Mock external provider logic
        this.logger.log(`[DELIVERED] ${notif.channel} to ${notif.user_id}: ${notif.title}`);

        await this.prisma.notification.update({
          where: { id: notif.id },
          data: { status: 'SENT' }
        });
      } catch (err) {
        this.logger.error(`Failed to send notification ${notif.id}: ${err}`);
        await this.prisma.notification.update({
          where: { id: notif.id },
          data: { retry_count: notif.retry_count + 1, status: notif.retry_count >= 2 ? 'FAILED' : 'PENDING' }
        });
      }
    }
  }
}
