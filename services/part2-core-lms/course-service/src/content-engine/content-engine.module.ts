import { Module } from '@nestjs/common';
import { ContentEngineService } from './content-engine.service';
import { ContentEngineController } from './content-engine.controller';
import { PrismaService } from '../prisma.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule],
  controllers: [ContentEngineController],
  providers: [ContentEngineService, PrismaService],
})
export class ContentEngineModule {}

