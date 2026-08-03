import { Module } from '@nestjs/common';
import { PrerequisitesService } from './prerequisites.service';
import { PrerequisitesController } from './prerequisites.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PrerequisitesController],
  providers: [PrerequisitesService, PrismaService],
})
export class PrerequisitesModule {}
