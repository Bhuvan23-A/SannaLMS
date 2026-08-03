import { Module } from '@nestjs/common';
import { LiveclassController } from './liveclass.controller';
import { LiveclassService } from './liveclass.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LiveclassController],
  providers: [LiveclassService, PrismaService],
})
export class LiveclassModule {}
