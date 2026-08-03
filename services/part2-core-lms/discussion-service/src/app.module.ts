import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ForumsModule } from './forums/forums.module';
import { ThreadsModule } from './threads/threads.module';
import { ChatModule } from './chat/chat.module';
import { ChatController } from './chat.controller';
import { PrismaService } from './prisma.service';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ForumsModule,
    ThreadsModule,
    ChatModule
  ],
  controllers: [AppController, ChatController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ],
})
export class AppModule {}
