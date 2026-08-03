import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  private generateCertNo(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `LMS-${year}-${rand}`;
  }

  async issueCertificate(data: Record<string, any>, tenantId: string) {
    // Check if already issued
    const existing = await this.prisma.certificate.findUnique({
      where: { course_id_user_id: { course_id: data.course_id, user_id: data.user_id } }
    });
    if (existing && !existing.is_revoked) return existing;

    return this.prisma.certificate.upsert({
      where: { course_id_user_id: { course_id: data.course_id, user_id: data.user_id } },
      create: {
        tenant_id: tenantId,
        course_id: data.course_id,
        user_id: data.user_id,
        course_title: data.course_title,
        student_name: data.student_name,
        grade: data.grade,
        cgpa: data.cgpa,
        certificate_no: this.generateCertNo(),
        is_revoked: false,
      },
      update: {
        is_revoked: false,
        revoke_reason: null,
        grade: data.grade,
        cgpa: data.cgpa,
        issued_at: new Date(),
      }
    });
  }

  async getCertificate(courseId: string, userId: string) {
    return this.prisma.certificate.findUnique({
      where: { course_id_user_id: { course_id: courseId, user_id: userId } }
    });
  }

  async verifyCertificate(certificateNo: string) {
    return this.prisma.certificate.findUnique({
      where: { certificate_no: certificateNo }
    });
  }

  async getUserCertificates(userId: string, tenantId: string) {
    return this.prisma.certificate.findMany({
      where: { user_id: userId, tenant_id: tenantId, is_revoked: false }
    });
  }

  async revokeCertificate(id: string, reason: string) {
    return this.prisma.certificate.update({
      where: { id },
      data: { is_revoked: true, revoke_reason: reason }
    });
  }
}
