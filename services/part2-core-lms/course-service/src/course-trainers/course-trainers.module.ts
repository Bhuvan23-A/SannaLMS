import { Module } from '@nestjs/common';
import { CourseTrainersService } from './course-trainers.service';
import { CourseTrainersController } from './course-trainers.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CourseTrainersController],
  providers: [CourseTrainersService, PrismaService],
})
export class CourseTrainersModule {}
