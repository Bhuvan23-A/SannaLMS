import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ThreadsService {
  constructor(private prisma: PrismaService) {}

  async createThread(data: Record<string, any>, userId: string, tenantId: string) {
    const forum = await this.prisma.forum.findUnique({ where: { id: data.forum_id } });
    if (forum?.is_locked) {
      throw new ForbiddenException('This forum is closed — new threads are disabled.');
    }
    return this.prisma.thread.create({
      data: {
        forum_id: data.forum_id,
        user_id: userId,
        tenant_id: tenantId,
        title: data.title,
        content: data.content,
      }
    });
  }

  async getThreads(forumId: string) {
    // Include each thread's replies (posts) so the UI renders them in one
    // call instead of N round-trips per thread (#fix).
    return this.prisma.thread.findMany({
      where: { forum_id: forumId },
      orderBy: { created_at: 'desc' },
      include: {
        posts: {
          orderBy: { created_at: 'asc' },
          select: { id: true, user_id: true, content: true, created_at: true },
        },
      },
    });
  }

  async createPost(threadId: string, data: Record<string, any>, userId: string, tenantId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: { forum: true },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.forum?.is_locked) {
      throw new ForbiddenException('This forum is closed — replies are disabled.');
    }
    return this.prisma.post.create({
      data: {
        thread_id: threadId,
        user_id: userId,
        tenant_id: tenantId,
        content: data.content,
        attachments: data.attachments || [],
        read_by: [userId],
      }
    });
  }

  async getPosts(threadId: string) {
    return this.prisma.post.findMany({
      where: { thread_id: threadId },
      orderBy: { created_at: 'asc' }
    });
  }

  async markPostRead(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) return null;
    const readBy = [...new Set([...(post.read_by || []), userId])];
    return this.prisma.post.update({ where: { id: postId }, data: { read_by: readBy } });
  }

  async markSolved(threadId: string) {
    return this.prisma.thread.update({
      where: { id: threadId },
      data: { is_solved: true }
    });
  }
}
