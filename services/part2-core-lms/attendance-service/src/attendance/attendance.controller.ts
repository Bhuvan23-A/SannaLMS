import { Controller, Post, Get, Body, Req, Param, Query, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { Roles } from '../roles.guard';

// Plain Error from services (e.g. "Session not found", "You are 500m away...") should
// surface as clean 4xx responses instead of generic 500s.
function asHttpError(err: unknown, fallback = 'Check-in failed'): never {
  if (err instanceof Error && err.message && !err.message.includes('Internal server error')) {
    throw new BadRequestException(err.message);
  }
  throw new BadRequestException(fallback);
}

@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Sessions
  @Post('sessions')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
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

  // Start a session — opens attendance for check-in (SCHEDULED -> LIVE)
  @Post('sessions/:id/start')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  async startSession(@Param('id') id: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    try {
      return await this.attendanceService.startSession(id, String(tenantId));
    } catch (err) {
      return asHttpError(err, 'Could not start session');
    }
  }

  // End a session — closes attendance immediately (LIVE -> ENDED)
  @Post('sessions/:id/end')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  async endSession(@Param('id') id: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    try {
      return await this.attendanceService.endSession(id, String(tenantId));
    } catch (err) {
      return asHttpError(err, 'Could not end session');
    }
  }

  // Manual marking
  @Post('sessions/:id/mark')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
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
  async checkInQR(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    try {
      return await this.attendanceService.checkInByQR(body.qr_token, String(userId), String(tenantId));
    } catch (err) {
      return asHttpError(err, 'Invalid QR code or session not found');
    }
  }

  // GPS check-in (Student self-check-in)
  @Post('checkin/gps')
  @Roles('STUDENT')
  async checkInGPS(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    const userId = req.user?.id || 'u-1';
    try {
      return await this.attendanceService.checkInByGPS(body.session_id, String(userId), body.lat, body.lng, String(tenantId));
    } catch (err) {
      return asHttpError(err, 'Outside location boundaries');
    }
  }

  // Records
  @Get('sessions/:id/records')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
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
