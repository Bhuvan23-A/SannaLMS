import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ThreadsController],
  providers: [ThreadsService, PrismaService],
})
export class ThreadsModule {}
