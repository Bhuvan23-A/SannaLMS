import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal Keycloak Admin REST API client.
 *
 * Auth: uses the `sannalms-api` service-account client (client_credentials) when
 * KEYCLOAK_ADMIN_SECRET is set, otherwise falls back to the master admin password
 * grant (admin-cli client) so local dev works out of the box.
 *
 * Env vars:
 *   KEYCLOAK_URL           (default http://sannalms-keycloak:8080)
 *   KEYCLOAK_REALM         (default sannalms)
 *   KEYCLOAK_ADMIN_CLIENT  (default sannalms-api)
 *   KEYCLOAK_ADMIN_SECRET  (service account secret)
 *   KEYCLOAK_ADMIN_USER    (fallback, default admin)
 *   KEYCLOAK_ADMIN_PASSWORD(fallback, default admin)
 */
@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private token: string | null = null;
  private tokenExpiry = 0;

  private base(): string {
    return process.env.KEYCLOAK_URL || 'http://sannalms-keycloak:8080';
  }

  private realm(): string {
    return process.env.KEYCLOAK_REALM || 'sannalms';
  }

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token;
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT || 'sannalms-api';
    const clientSecret = process.env.KEYCLOAK_ADMIN_SECRET || '';

    const params = new URLSearchParams();
    if (clientSecret) {
      params.set('grant_type', 'client_credentials');
      params.set('client_id', clientId);
      params.set('client_secret', clientSecret);
    } else {
      params.set('grant_type', 'password');
      params.set('client_id', 'admin-cli');
      params.set('username', process.env.KEYCLOAK_ADMIN_USER || 'admin');
      params.set('password', process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin');
    }

    const res = await fetch(`${this.base()}/realms/${this.realm()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Keycloak token request failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new Error('Keycloak token response missing access_token');
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in || 60) - 30) * 1000;
    return this.token;
  }

  private async req(path: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getToken();
    const res = await fetch(`${this.base()}/admin/realms/${this.realm()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.text().catch(() => '');
      throw new Error(`Keycloak API ${options.method || 'GET'} ${path}: ${res.status} ${body.slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async getUser(userId: string): Promise<any | null> {
    try {
      return await this.req(`/users/${userId}`);
    } catch {
      return null;
    }
  }

  async findUserByEmail(email: string): Promise<any | null> {
    try {
      const users = await this.req(`/users?email=${encodeURIComponent(email)}&exact=true`);
      return Array.isArray(users) && users.length > 0 ? users[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Create a Keycloak user. Returns { existing: boolean, id: string }.
   */
  async createUser(payload: any): Promise<{ existing: boolean; id: string }> {
    const existing = await this.findUserByEmail(payload.email);
    if (existing) return { existing: true, id: existing.id };

    const token = await this.getToken();
    const res = await fetch(`${this.base()}/admin/realms/${this.realm()}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      const found = await this.findUserByEmail(payload.email);
      return { existing: true, id: found?.id || '' };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Keycloak createUser failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const loc = res.headers.get('location') || '';
    const id = loc.split('/').pop() || '';
    return { existing: false, id };
  }

  async assignRealmRole(userId: string, roleName: string): Promise<void> {
    if (!userId) throw new Error('Empty user id for role assignment');
    const all = await this.req(`/roles`);
    const role = Array.isArray(all) ? all.find((r: any) => r.name === roleName) : null;
    if (!role) throw new Error(`Realm role "${roleName}" not found`);
    await this.req(`/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify([{ id: role.id, name: role.name }]),
    });
  }

  /**
   * Reset a user's password to the given value (non-temporary). Used when a
   * college-admin email already exists so the returned credentials are always
   * valid instead of silently keeping the previous owner's unknown password.
   */
  async resetUserPassword(userId: string, password: string): Promise<void> {
    if (!userId) throw new Error('Empty user id for password reset');
    await this.req(`/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ type: 'password', value: password, temporary: false }),
    });
  }

  /**
   * Remove a direct realm role mapping from a user. The realm's composite
   * default role grants `student` to every new user; this strips a direct
   * `student` mapping if one was ever assigned explicitly. (The composite
   * grant itself is left untouched — it matches how the demo accounts work.)
   */
  async removeRealmRole(userId: string, roleName: string): Promise<void> {
    if (!userId) throw new Error('Empty user id for role removal');
    const all = await this.req(`/roles`);
    const role = Array.isArray(all) ? all.find((r: any) => r.name === roleName) : null;
    if (!role) return;
    await this.req(`/users/${userId}/role-mappings/realm`, {
      method: 'DELETE',
      body: JSON.stringify([{ id: role.id, name: role.name }]),
    });
  }

  /**
   * Enable/disable a Keycloak user. Disabling revokes login access instantly
   * (Keycloak rejects auth for disabled users, so it works even for tokens
   * issued before the change). Used when a college is held / restored.
   */
  async setUserEnabled(userId: string, enabled: boolean): Promise<void> {
    if (!userId) throw new Error('Empty user id for enable/disable');
    await this.req(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  /**
   * Permanently delete a Keycloak user — irreversible. Only used by the
   * college hard-delete flow after all tenant data has been purged.
   */
  async deleteUser(userId: string): Promise<void> {
    if (!userId) return;
    await this.req(`/users/${userId}`, { method: 'DELETE' }).catch(() => {
      // 204 is expected; tolerate missing user (already gone)
    });
  }
}
