import { Controller, Post, Get, Param, Body, Req, Query } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('issue')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  issue(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.certificatesService.issueCertificate(body, String(tenantId));
  }

  @Get('my')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getMyCertificates(@Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.certificatesService.getUserCertificates(String(userId), String(tenantId));
  }

  // Public verification endpoint - no role guard needed
  @Get('verify/:certificateNo')
  verify(@Param('certificateNo') certNo: string) {
    return this.certificatesService.verifyCertificate(certNo);
  }

  @Post(':id/revoke')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  revoke(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.certificatesService.revokeCertificate(id, body.reason || 'No reason given');
  }
}
