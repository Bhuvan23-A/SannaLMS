import { Module } from '@nestjs/common';
import { RostersService } from './rosters.service';
import { RostersController } from './rosters.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [RostersController],
  providers: [RostersService, PrismaService],
})
export class RostersModule {}
