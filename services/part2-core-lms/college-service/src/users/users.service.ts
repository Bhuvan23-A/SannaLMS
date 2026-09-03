import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { KeycloakAdminService } from '../keycloak-admin.service';

// Single source of truth for the default password of runtime-created accounts.
// MUST match the password of the seeded demo accounts (docs/DEMO_SCRIPT.md uses
// `Test@1234` for test_superadmin / test_collegeadmin / ...) so every test
// credential is consistent. The UI shows this to admins when a college admin
// is auto-created so nobody has to guess it.
export const DEFAULT_PASSWORD = 'Test@1234';

export interface ImportUser {
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;          // student | professor | instructor | teaching_assistant | college_admin ...
  password?: string;
  phone?: string;
  phone_number?: string;
  mobile?: string;
  contact?: string;
  tenant_id?: string;
  department?: string;
  branch?: string;
  year?: string | number;
}

// CSV / JSON role word → Keycloak realm role name
export function realmRoleFor(role?: string): string | null {
  const r = (role || '').trim().toLowerCase();
  if (!r) return null;
  if (['student'].includes(r)) return 'student';
  if (['professor', 'instructor', 'trainer', 'primary_trainer', 'teacher', 'faculty'].includes(r)) return 'instructor';
  if (['teaching_assistant', 'assistant', 'ta'].includes(r)) return 'TEACHING_ASSISTANT';
  if (['college_admin', 'tenantadmin', 'admin', 'college-admin'].includes(r)) return 'tenantadmin';
  if (['super_admin', 'superadmin', 'root'].includes(r)) return 'superadmin';
  return null;
}

// role word → LMS UserRole.role enum value
export function lmsRoleFor(role?: string): string {
  const r = (role || '').trim().toLowerCase();
  if (['professor', 'instructor', 'trainer', 'primary_trainer', 'teacher', 'faculty'].includes(r)) return 'PRIMARY_TRAINER';
  if (['teaching_assistant', 'assistant', 'ta'].includes(r)) return 'TEACHING_ASSISTANT';
  if (['college_admin', 'tenantadmin', 'admin', 'college-admin'].includes(r)) return 'COLLEGE_ADMIN';
  if (['super_admin', 'superadmin', 'root'].includes(r)) return 'SUPER_ADMIN';
  if (['guest_faculty'].includes(r)) return 'GUEST_FACULTY';
  return 'STUDENT';
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private keycloak: KeycloakAdminService,
  ) {}

  /**
   * Bulk-create users: Keycloak (identity + roles + attributes) and the LMS
   * college user store (User + UserRole). Skips duplicates; reports per-user status.
   */
  async bulkImport(body: { users: ImportUser[]; default_password?: string; college_id?: string; require_password_change?: boolean }) {
    const users = Array.isArray(body.users) ? body.users : [];
    if (users.length === 0) throw new BadRequestException('users[] is required');
    const defaultPassword = body.default_password || DEFAULT_PASSWORD;
    const collegeId = body.college_id || '';

    // #fix — derive the tenant from the SELECTED college, never from a hardcoded
    // fallback. The CSV rows carry department/branch/year but no tenant_id column,
    // so before this every imported user silently landed in `test-college` and was
    // invisible to the real college (broken logins, rosters and enrollments).
    let collegeTenant: string | null = null;
    if (collegeId) {
      const college = await this.prisma.extendedClient.college.findUnique({ where: { id: collegeId } });
      collegeTenant = college?.tenant_id || null;
    }
    const tenantFor = (u: ImportUser) => collegeTenant || u.tenant_id || 'test-college';

    const results: any[] = [];
    for (const u of users) {
      try {
        if (!u.email || !u.email.includes('@')) throw new Error('Missing or invalid email');

        const requireChange = body.require_password_change === true;
        const userPhone = (u.phone || u.phone_number || u.mobile || u.contact || '').trim();
        // For students and users, default password is their phone number if present, otherwise custom password or default
        const userPassword = u.password || (userPhone && userPhone.length >= 6 ? userPhone : defaultPassword);

        const kc = await this.keycloak.createUser({
          username: u.username || u.email,
          email: u.email,
          enabled: true,
          emailVerified: true,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          credentials: [{ type: 'password', value: userPassword, temporary: requireChange }],
          attributes: {
            tenant_id: [tenantFor(u)],
            ...(userPhone ? { phone: [userPhone], phone_number: [userPhone], mobile: [userPhone] } : {}),
            ...(u.department ? { department: [u.department] } : {}),
            ...(u.branch ? { branch: [u.branch] } : {}),
            ...(u.year !== undefined && u.year !== '' ? { year: [String(u.year)] } : {}),
            ...(collegeId ? { college_id: [collegeId] } : {}),
          },
        });

        const realmRole = realmRoleFor(u.role);
        if (realmRole && kc.id) {
          await this.keycloak.assignRealmRole(kc.id, realmRole);
          // The realm's composite default role grants `student` to every new user.
          // Non-students should not keep it (prevents student-portal access).
          if (realmRole !== 'student' && kc.id) {
            await this.keycloak.removeRealmRole(kc.id, 'student').catch(() => {});
          }
        }

        // LMS-side user record (id mirrors the Keycloak user id)
        const user = await this.prisma.extendedClient.user.upsert({
          where: { email: u.email.toLowerCase() },
          create: {
            id: kc.id || undefined,
            email: u.email.toLowerCase(),
            password: '',
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            tenant_id: tenantFor(u),
          },
          update: {},
        });

        // Link the user to the college with their role
        if (collegeId) {
          await this.prisma.extendedClient.userRole
            .create({
              data: {
                user_id: user.id,
                college_id: collegeId,
                role: lmsRoleFor(u.role) as any,
                tenant_id: tenantFor(u),
              },
            })
            .catch(() => { /* duplicate (user_id, college_id, role) already exists */ });
        }

        results.push({ email: u.email, status: kc.existing ? 'already_exists' : 'created', keycloak_id: kc.id || null, role: lmsRoleFor(u.role) });
      } catch (err: any) {
        results.push({ email: u.email || '(no email)', status: 'failed', error: err?.message || 'Unknown error' });
      }
    }

    return {
      total: users.length,
      created: results.filter((r) => r.status === 'created').length,
      already_exists: results.filter((r) => r.status === 'already_exists').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    };
  }

  /**
   * Create (or find) the college admin in Keycloak with the tenantadmin role and
   * link them to the college in the LMS user store.
   */
  async assignCollegeAdmin(college: any, admin: { email: string; first_name?: string; last_name?: string; password?: string }) {
    if (!admin.email || !admin.email.includes('@')) throw new BadRequestException('Admin email is required');

    const kc = await this.keycloak.createUser({
      username: admin.email,
      email: admin.email,
      enabled: true,
      emailVerified: true,
      firstName: admin.first_name || 'College',
      lastName: admin.last_name || 'Admin',
      credentials: [{ type: 'password', value: admin.password || DEFAULT_PASSWORD, temporary: false }],
      attributes: {
        tenant_id: [college.tenant_id || 'test-college'],
        college_id: [college.id],
      },
    });
    if (kc.id) {
      await this.keycloak.assignRealmRole(kc.id, 'tenantadmin');
      // If the Keycloak user already existed (createUser returned existing:true)
      // their old password would silently stay in place — reset it to the
      // documented default so the returned credentials are always valid (#fix).
      if (kc.existing) {
        await this.keycloak.resetUserPassword(kc.id, admin.password || DEFAULT_PASSWORD).catch(() => {});
      }
    }

    const user = await this.prisma.extendedClient.user.upsert({
      where: { email: admin.email.toLowerCase() },
      create: {
        id: kc.id || undefined,
        email: admin.email.toLowerCase(),
        password: '',
        first_name: admin.first_name || 'College',
        last_name: admin.last_name || 'Admin',
        tenant_id: college.tenant_id || 'test-college',
      },
      update: {},
    });

    await this.prisma.extendedClient.userRole
      .create({
        data: {
          user_id: user.id,
          college_id: college.id,
          role: 'COLLEGE_ADMIN',
          tenant_id: college.tenant_id || 'test-college',
        },
      })
      .catch(() => {});

    return {
      college_id: college.id,
      admin_email: admin.email,
      admin_username: admin.email,
      admin_password: admin.password || DEFAULT_PASSWORD,
      keycloak_id: kc.id || null,
    };
  }

  async assignCollegeAdminById(collegeId: string, admin: { email: string; first_name?: string; last_name?: string; password?: string; tenant_id?: string }) {
    const college = await this.prisma.extendedClient.college.findUnique({ where: { id: collegeId } });
    if (!college) throw new BadRequestException('College not found');
    return this.assignCollegeAdmin(college, admin);
  }

  /**
   * Super-admin action: reset the college admin's Keycloak password so access
   * can be handed over after onboarding (or recovered when it's lost). Returns
   * the new credentials — shown to the super admin exactly once.
   */
  async resetCollegeAdminPassword(collegeId: string) {
    const college = await this.prisma.extendedClient.college.findUnique({ where: { id: collegeId } });
    if (!college) throw new BadRequestException('College not found');

    // The college admin is the UserRole row with role COLLEGE_ADMIN for this college
    const adminLink = await this.prisma.extendedClient.userRole.findFirst({
      where: { college_id: collegeId, role: 'COLLEGE_ADMIN' as any, deleted_at: null },
      include: { user: true },
    });

    const email = adminLink?.user?.email;
    if (!email) {
      throw new BadRequestException('This college has no admin yet. Add one first (Assign Admin).');
    }

    let keycloakId = adminLink?.user?.id;
    if (!keycloakId) {
      const kc = await this.keycloak.findUserByEmail(email);
      keycloakId = kc?.id || '';
    }
    if (!keycloakId) {
      throw new BadRequestException('Admin user not found in Keycloak.');
    }

    await this.keycloak.resetUserPassword(keycloakId, DEFAULT_PASSWORD);
    return {
      college_id: college.id,
      admin_email: email,
      admin_username: email,
      admin_password: DEFAULT_PASSWORD,
      note: 'Password reset — share these credentials with the college admin.',
    };
  }

  /**
   * List users for notification targeting and management screens.
   * Filters: college_id, role (word, e.g. "student"), tenant_id, and optionally
   * department/branch/year (Keycloak attributes set during bulk import).
   */
  async listUsers(filters: { college_id?: string; role?: string; tenant_id?: string; department?: string; branch?: string; year?: string } = {}) {
    const where: any = {};
    if (filters.college_id) where.college_id = filters.college_id;
    if (filters.role) where.role = lmsRoleFor(filters.role) as any;
    if (filters.tenant_id) where.tenant_id = filters.tenant_id;

    let userRoles = await this.prisma.extendedClient.userRole.findMany({
      where,
      include: { user: true },
    });

    let users = userRoles.map((ur: any) => ({
      id: ur.user.id,
      email: ur.user.email,
      first_name: ur.user.first_name,
      last_name: ur.user.last_name,
      role: ur.role,
      college_id: ur.college_id,
      tenant_id: ur.tenant_id || ur.user.tenant_id,
    }));

    // department/branch/year live on the Keycloak user attributes, so filter
    // them via the identity provider (best effort, skips users with no record).
    if (filters.department || filters.branch || filters.year) {
      const filtered: any[] = [];
      for (const u of users) {
        const kc = await this.keycloak.getUser(u.id).catch(() => null);
        if (!kc) continue;
        const attrs = kc.attributes || {};
        const dept = (attrs.department || [])[0];
        const br = (attrs.branch || [])[0];
        const yr = (attrs.year || [])[0];
        if (filters.department && dept !== filters.department) continue;
        if (filters.branch && br !== filters.branch) continue;
        if (filters.year && yr !== filters.year) continue;
        filtered.push(u);
      }
      users = filtered;
    }

    return users;
  }

  /**
   * Enable or disable every Keycloak user of a tenant. Used when a college is
   * held (block all logins) and restored (re-enable them). Runs per-user so a
   * single failure never aborts the batch; the LMS user rows are found by the
   * tenant_id stamped on the record (id mirrors the Keycloak user id).
   */
  async setTenantUsersEnabled(tenantId: string, enabled: boolean): Promise<{ updated: number; failed: number }> {
    const users = await this.prisma.extendedClient.user.findMany({ where: { tenant_id: tenantId } });
    let updated = 0;
    let failed = 0;
    for (const u of users) {
      if (!u.id) continue;
      try {
        await this.keycloak.setUserEnabled(u.id, enabled);
        updated++;
      } catch {
        failed++;
      }
    }
    return { updated, failed };
  }

  /**
   * Permanently delete every Keycloak user of a tenant (hard delete). The LMS
   * user rows themselves are purged by CollegeService (they carry FK links);
   * this only removes the identities from Keycloak.
   */
  async deleteTenantUsers(tenantId: string): Promise<{ deleted: number; failed: number }> {
    const users = await this.prisma.extendedClient.user.findMany({ where: { tenant_id: tenantId } });
    let deleted = 0;
    let failed = 0;
    for (const u of users) {
      if (!u.id) continue;
      try {
        await this.keycloak.deleteUser(u.id);
        deleted++;
      } catch {
        failed++;
      }
    }
    return { deleted, failed };
  }

  /**
   * Self-service password change: Any authenticated student, faculty, or admin
   * updates their own Keycloak password.
   */
  async changePassword(userId: string, newPassword: string) {
    if (!userId) throw new BadRequestException('User ID not found in token');
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    let keycloakId = userId;
    const kcUser = await this.keycloak.getUser(userId).catch(() => null);
    if (!kcUser) {
      const lmsUser = await this.prisma.extendedClient.user.findUnique({ where: { id: userId } });
      if (lmsUser?.email) {
        const found = await this.keycloak.findUserByEmail(lmsUser.email);
        if (found?.id) keycloakId = found.id;
      }
    }

    await this.keycloak.resetUserPassword(keycloakId, newPassword);
    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Admin-driven password reset: Superadmin, College Admin, or Trainer resets a specific
   * user's Keycloak password so access can be recovered when credentials are lost.
   */
  async adminResetPassword(targetUserId: string, newPassword?: string) {
    if (!targetUserId) throw new BadRequestException('Target user ID is required');
    const password = newPassword || DEFAULT_PASSWORD;
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    let keycloakId = targetUserId;
    const kcUser = await this.keycloak.getUser(targetUserId).catch(() => null);
    if (!kcUser) {
      const lmsUser = await this.prisma.extendedClient.user.findFirst({
        where: { OR: [{ id: targetUserId }, { email: targetUserId }] },
      });
      if (lmsUser?.email) {
        const found = await this.keycloak.findUserByEmail(lmsUser.email);
        if (found?.id) keycloakId = found.id;
      } else if (targetUserId.includes('@')) {
        const found = await this.keycloak.findUserByEmail(targetUserId);
        if (found?.id) keycloakId = found.id;
      }
    }

    await this.keycloak.resetUserPassword(keycloakId, password);
    return {
      success: true,
      message: 'Password reset successfully',
      user_id: targetUserId,
      new_password: password,
    };
  }

  /**
   * Student & user self-service password recovery:
   * Allows students/users to reset their Keycloak password using their email/username and phone number.
   */
  async forgotPassword(body: { email?: string; username?: string; identifier?: string; phone?: string; new_password?: string }) {
    const ident = (body.email || body.username || body.identifier || '').trim().toLowerCase();
    if (!ident) throw new BadRequestException('Email address or username is required');

    const kcUser = await this.keycloak.findUserByUsernameOrEmail(ident);
    if (!kcUser) {
      throw new NotFoundException('No user account found with the provided email or username');
    }

    const registeredPhone = kcUser.attributes?.phone?.[0] || kcUser.attributes?.phone_number?.[0] || kcUser.attributes?.mobile?.[0] || '';
    const inputPhone = (body.phone || '').trim().replace(/\D/g, '');

    if (registeredPhone && inputPhone) {
      const cleanRegistered = registeredPhone.replace(/\D/g, '');
      if (cleanRegistered !== inputPhone && !cleanRegistered.endsWith(inputPhone) && !inputPhone.endsWith(cleanRegistered)) {
        throw new BadRequestException('Phone number does not match registered account details');
      }
    }

    const newPass = (body.new_password && body.new_password.length >= 6)
      ? body.new_password
      : (inputPhone || registeredPhone || DEFAULT_PASSWORD);

    if (!newPass || newPass.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    await this.keycloak.resetUserPassword(kcUser.id, newPass);
    return {
      success: true,
      message: 'Password reset successfully! You can now log in with your updated password.',
    };
  }
}
