import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async enqueueNotification(data: Record<string, any>, tenantId: string) {
    const prefs = await this.getPreferences(String(data['user_id']), tenantId);
    
    // Determine which channels to send to
    const channels: string[] = [];
    if (prefs.email && data['channels']?.includes('EMAIL')) channels.push('EMAIL');
    if (prefs.sms && data['channels']?.includes('SMS')) channels.push('SMS');
    if (prefs.push && data['channels']?.includes('PUSH')) channels.push('PUSH');
    if (prefs.web && data['channels']?.includes('WEB')) channels.push('WEB');

    // Default to WEB if none specified but system requires delivery
    if (channels.length === 0) channels.push('WEB');

    const created = await Promise.all(channels.map(channel => 
      this.prisma.notification.create({
        data: {
          user_id: String(data['user_id']),
          tenant_id: tenantId,
          type: String(data['type'] || 'SYSTEM'),
          title: String(data['title']),
          body: String(data['body']),
          channel: channel
        }
      })
    ));

    return created;
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
