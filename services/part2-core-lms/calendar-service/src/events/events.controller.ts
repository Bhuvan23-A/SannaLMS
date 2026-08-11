import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    // Super admin schedules global events under 'master'; others under their own tenant
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body['tenant_id'] || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.eventsService.create({ ...body, role: isSuperAdmin ? 'superadmin' : req.user?.roles?.[0] }, String(tenantId));
  }

  @Get()
  @Roles(
    'SUPER_ADMIN',
    'COLLEGE_ADMIN',
    'PRIMARY_TRAINER',
    'TEACHING_ASSISTANT',
    'STUDENT',
  )
  findAll(@Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.eventsService.findAll(String(tenantId), !!isSuperAdmin);
  }

  @Get(':id')
  @Roles(
    'SUPER_ADMIN',
    'COLLEGE_ADMIN',
    'PRIMARY_TRAINER',
    'TEACHING_ASSISTANT',
    'STUDENT',
  )
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
