import { Module } from '@nestjs/common';
import { ForumsController } from './forums.controller';
import { ForumsService } from './forums.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ForumsController],
  providers: [ForumsService, PrismaService],
})
export class ForumsModule {}
