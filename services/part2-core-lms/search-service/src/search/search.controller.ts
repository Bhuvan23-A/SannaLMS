import { Controller, Get, Query, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  async globalSearch(@Query('q') query: string, @Req() req: Record<string, any>) {
    if (!query) return [];
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.searchService.search(query, String(tenantId));
  }
}
