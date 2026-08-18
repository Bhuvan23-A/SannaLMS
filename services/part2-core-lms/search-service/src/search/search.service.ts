import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Each LMS service owns its own database (sannalms_course, sannalms_discussion,
// ...). The old search code queried `courses."Course"` / `discussions."Forum"`
// as schemas inside the base `sannalms` database — those schemas never existed,
// so EVERY search threw and returned []. We now connect to the real databases
// with a dedicated pool each (#search-fix).
const COURSE_DB_URL = process.env.COURSE_DB_URL || 'postgresql://postgres:postgres@postgres:5432/sannalms_course';
const DISCUSSION_DB_URL = process.env.DISCUSSION_DB_URL || 'postgresql://postgres:postgres@postgres:5432/sannalms_discussion';

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private coursePool: Pool;
  private discussionPool: Pool;

  onModuleInit() {
    this.coursePool = new Pool({ connectionString: COURSE_DB_URL });
    this.discussionPool = new Pool({ connectionString: DISCUSSION_DB_URL });
  }

  async onModuleDestroy() {
    await Promise.all([this.coursePool?.end?.(), this.discussionPool?.end?.()]);
  }

  async search(query: string, tenantId: string) {
    const results: any[] = [];

    // tenantId === 'master' (super admin) → search across ALL colleges.
    const isAllTenants = tenantId === 'master' || !tenantId;
    const like = `%${query}%`;

    // Search Courses (sannalms_course DB)
    try {
      const courseRes = isAllTenants
        ? await this.coursePool.query(
            `SELECT id, title, description, 'COURSE' as type, tenant_id
             FROM "Course"
             WHERE title ILIKE $1 OR description ILIKE $1
             ORDER BY title LIMIT 10`,
            [like],
          )
        : await this.coursePool.query(
            `SELECT id, title, description, 'COURSE' as type, tenant_id
             FROM "Course"
             WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
             ORDER BY title LIMIT 10`,
            [tenantId, like],
          );
      results.push(...courseRes.rows);
    } catch (e) {
      console.log('Courses search unavailable:', e.message);
    }

    // Search Forums (sannalms_discussion DB)
    try {
      const forumRes = isAllTenants
        ? await this.discussionPool.query(
            `SELECT id, title, description, 'FORUM' as type, tenant_id
             FROM "Forum"
             WHERE title ILIKE $1 OR description ILIKE $1
             ORDER BY title LIMIT 10`,
            [like],
          )
        : await this.discussionPool.query(
            `SELECT id, title, description, 'FORUM' as type, tenant_id
             FROM "Forum"
             WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
             ORDER BY title LIMIT 10`,
            [tenantId, like],
          );
      results.push(...forumRes.rows);
    } catch (e) {
      console.log('Forums search unavailable:', e.message);
    }

    // Search Threads (sannalms_discussion DB)
    try {
      const threadRes = isAllTenants
        ? await this.discussionPool.query(
            `SELECT t.id, t.forum_id, t.title, t.content as description, 'THREAD' as type, t.tenant_id
             FROM "Thread" t
             WHERE t.title ILIKE $1 OR t.content ILIKE $1
             ORDER BY t.title LIMIT 10`,
            [like],
          )
        : await this.discussionPool.query(
            `SELECT t.id, t.forum_id, t.title, t.content as description, 'THREAD' as type, t.tenant_id
             FROM "Thread" t
             WHERE t.tenant_id = $1 AND (t.title ILIKE $2 OR t.content ILIKE $2)
             ORDER BY t.title LIMIT 10`,
            [tenantId, like],
          );
      results.push(...threadRes.rows);
    } catch (e) {
      console.log('Threads search unavailable:', e.message);
    }

    return results;
  }
}
