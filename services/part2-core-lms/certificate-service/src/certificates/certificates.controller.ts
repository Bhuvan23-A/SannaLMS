import { Controller, Post, Get, Param, Body, Req, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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

  // Upload the sample/template certificate for a course (#17)
  @Post('template')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, _file, cb) => {
          const isSuperAdmin = req.user?.roles?.includes('superadmin');
          const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
          const uploadDir = join(process.cwd(), 'uploads', tenantId, 'certificate-templates');
          if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    })
  )
  uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body('course_id') courseId: string,
    @Req() req: Record<string, any>
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Use multipart field "file".');
    if (!courseId) throw new BadRequestException('course_id is required');
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.certificatesService.uploadTemplate(String(courseId), String(tenantId), file);
  }

  // Get the template for a course (if uploaded)
  @Get('template/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  getTemplate(@Param('courseId') courseId: string) {
    return this.certificatesService.getTemplate(courseId);
  }

  @Get('my')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getMyCertificates(@Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.certificatesService.getUserCertificates(String(userId), String(tenantId));
  }

  // Platform/college-wide certificate list — powers the analytics count (#fix).
  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  getAll(@Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.certificatesService.getAllCertificates(String(tenantId));
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

  // Batch issue certificates for multiple students at once (#batch-certs)
  @Post('batch-issue')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  batchIssue(@Body() body: { students: Array<Record<string, any>> }, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (req.user?.tenantId || 'master') : (req.user?.tenantId || 'test-tenant');
    if (!body.students || !Array.isArray(body.students) || body.students.length === 0) {
      throw new BadRequestException('students array is required');
    }
    return this.certificatesService.batchIssueCertificates(body.students, String(tenantId));
  }
}
