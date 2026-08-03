import { Controller, Post, Body, Req } from '@nestjs/common';
import { PrerequisitesService } from './prerequisites.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/prerequisites')
export class PrerequisitesController {
  constructor(private readonly prerequisitesService: PrerequisitesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  create(@Body() body: any, @Req() req: any) {
    return this.prerequisitesService.create(body, body.tenant_id);
  }
}
