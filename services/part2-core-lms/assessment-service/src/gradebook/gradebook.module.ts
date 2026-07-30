import { Module } from '@nestjs/common';
import { GradebookController } from './gradebook.controller';
import { GradebookService } from './gradebook.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [GradebookController],
  providers: [GradebookService, PrismaService],
})
export class GradebookModule {}
