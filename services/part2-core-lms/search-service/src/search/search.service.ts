import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  onModuleInit() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async search(query: string, tenantId: string) {
    // 1. Search Courses (public schema equivalent, or 'courses' schema)
    // 2. Search Discussions ('discussions' schema)
    // We will do simple ILIKE searches across multiple tables to simulate platform search.
    
    const results: any[] = [];

    // Search Courses
    try {
      const courseRes = await this.pool.query(
        `SELECT id, title, description, 'COURSE' as type 
         FROM courses."Course" 
         WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2) LIMIT 10`,
        [tenantId, `%${query}%`]
      );
      results.push(...courseRes.rows);
    } catch (e) {
      console.log('Courses table not ready or schema missing', e.message);
    }

    // Search Discussions
    try {
      const forumRes = await this.pool.query(
        `SELECT id, title, description, 'FORUM' as type 
         FROM discussions."Forum" 
         WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2) LIMIT 10`,
        [tenantId, `%${query}%`]
      );
      results.push(...forumRes.rows);
    } catch (e) {
      console.log('Discussions table not ready or schema missing', e.message);
    }

    // Search Threads
    try {
      const threadRes = await this.pool.query(
        `SELECT t.id, t.title, t.content as description, 'THREAD' as type 
         FROM discussions."Thread" t
         JOIN discussions."Forum" f ON t.forum_id = f.id
         WHERE f.tenant_id = $1 AND (t.title ILIKE $2 OR t.content ILIKE $2) LIMIT 10`,
        [tenantId, `%${query}%`]
      );
      results.push(...threadRes.rows);
    } catch (e) {
      console.log('Threads table not ready', e.message);
    }

    return results;
  }
}
