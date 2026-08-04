import { Controller, Post, Get, Body, Req, Param, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Sessions
  @Post('sessions')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  createSession(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.attendanceService.createSession(body, String(tenantId));
  }

  @Get('sessions')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getSessions(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.attendanceService.getSessions(String(tenantId), courseId);
  }

  // Manual marking
  @Post('sessions/:id/mark')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  markManual(
    @Param('id') sessionId: string,
    @Body() body: Record<string, any>,
    @Req() req: Record<string, any>
  ) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.attendanceService.markManual(sessionId, body.user_id, body.status || 'PRESENT', String(tenantId));
  }

  // QR check-in (Student self-check-in)
  @Post('checkin/qr')
  @Roles('STUDENT')
  checkInQR(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.attendanceService.checkInByQR(body.qr_token, String(userId), String(tenantId));
  }

  // GPS check-in (Student self-check-in)
  @Post('checkin/gps')
  @Roles('STUDENT')
  checkInGPS(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    return this.attendanceService.checkInByGPS(body.session_id, String(userId), body.lat, body.lng, String(tenantId));
  }

  // Records
  @Get('sessions/:id/records')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  getRecords(@Param('id') sessionId: string) {
    return this.attendanceService.getSessionRecords(sessionId);
  }

  @Get('report/:courseId/student/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getStudentReport(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
    @Req() req: Record<string, any>
  ) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.attendanceService.getStudentAttendance(courseId, userId, String(tenantId));
  }
}
