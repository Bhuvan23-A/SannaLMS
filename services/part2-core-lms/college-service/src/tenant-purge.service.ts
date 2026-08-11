import { Injectable } from '@nestjs/common';

/**
 * Calls each service's /api/v1/admin/purge-tenant endpoint over the internal
 * Docker network so a college hard-delete removes its data from every service
 * database (courses, assessments, attendance, discussions, notifications).
 * Uses the same x-mock-roles internal auth pattern as notification-service.
 */
@Injectable()
export class TenantPurgeService {
  // Container names + internal ports (matches kong.yml's upstream targets).
  private readonly SERVICES: { name: string; url: string }[] = [
    { name: 'course', url: process.env.COURSE_SERVICE_URL || 'http://sannalms-course-service:3001' },
    { name: 'assessment', url: process.env.ASSESSMENT_SERVICE_URL || 'http://sannalms-assessment-p2:3002' },
    { name: 'attendance', url: process.env.ATTENDANCE_SERVICE_URL || 'http://sannalms-attendance-service:3003' },
    { name: 'discussion', url: process.env.DISCUSSION_SERVICE_URL || 'http://sannalms-discussion-service:3006' },
    { name: 'notification', url: process.env.NOTIFICATION_SERVICE_URL || 'http://sannalms-notification-service:3009' },
  ];

  async purgeTenant(tenantId: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    for (const svc of this.SERVICES) {
      try {
        const res = await fetch(`${svc.url}/api/v1/admin/purge-tenant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-mock-roles': 'SUPER_ADMIN',
          },
          body: JSON.stringify({ tenant_id: tenantId }),
        });
        results[svc.name] = res.ok ? await res.json() : { error: `HTTP ${res.status}` };
      } catch (err: any) {
        results[svc.name] = { error: err?.message || 'unreachable' };
      }
    }
    return results;
  }
}
