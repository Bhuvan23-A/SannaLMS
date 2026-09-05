// Shared auth helpers for the admin UI.

// The canonical public domains for the SannaLMS platform.
export const ADMIN_DOMAIN = 'https://admin.sannalms.sannainnovations.com';
export const PORTAL_URL = 'https://sannalms.sannainnovations.com';
const KEYCLOAK_BASE = 'https://sannalms.sannainnovations.com/auth';
const KEYCLOAK_REALM = 'sannalms';
const KEYCLOAK_CLIENT = 'sannalms-client';

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'COLLEGE_ADMIN': return 'College Admin';
    case 'PRIMARY_TRAINER': return 'Trainer';
    case 'TEACHING_ASSISTANT': return 'Teaching Assistant';
    case 'STUDENT': return 'Student';
    default: return role;
  }
}

export function handleLogout(): void {
  let isEdulateral = false;
  try {
    const brand = localStorage.getItem('preferred_brand') || localStorage.getItem('preferred_tenant') || '';
    isEdulateral = brand === 'edulateral' || (typeof document !== 'undefined' && document.cookie.includes('preferred_brand=edulateral'));
  } catch (_) {}

  // 1. Clear session tokens but preserve brand preference
  localStorage.removeItem('access_token');
  sessionStorage.clear();

  // 2. Build Keycloak logout URL.
  const targetPortal = isEdulateral ? `${PORTAL_URL}/?brand=edulateral` : PORTAL_URL;
  const redirectUri = encodeURIComponent(targetPortal);
  const logoutUrl =
    `${KEYCLOAK_BASE}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout` +
    `?post_logout_redirect_uri=${redirectUri}` +
    `&client_id=${KEYCLOAK_CLIENT}`;

  window.location.href = logoutUrl;
}

/**
 * Call this when admin-ui receives a ?token=... redirect from the main portal.
 * Stores the access token and decodes the user profile into localStorage.
 */
export function storeTokenFromUrl(): { token: string | null; role: string | null } {
  if (typeof window === 'undefined') return { token: null, role: null };
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return { token: null, role: null };

  localStorage.setItem('access_token', token);

  // Decode JWT payload (no verification needed — Keycloak signed it)
  let role: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const roles: string[] = payload?.realm_access?.roles || [];
    if (roles.includes('superadmin')) role = 'SUPER_ADMIN';
    else if (roles.includes('tenantadmin')) role = 'COLLEGE_ADMIN';
    else if (roles.includes('instructor')) role = 'PRIMARY_TRAINER';
    else if (roles.includes('TEACHING_ASSISTANT')) role = 'TEACHING_ASSISTANT';
    else if (roles.includes('student')) role = 'STUDENT';

    if (role) localStorage.setItem('mockRole', role);
    const username = payload?.preferred_username || payload?.name || 'User';
    const email = payload?.email || '';
    localStorage.setItem('username', username);
    localStorage.setItem('userEmail', email);
    if (payload?.sub) localStorage.setItem('userId', payload.sub);
  } catch {
    // ignore decode error
  }

  // Remove token from URL bar so the raw JWT isn't visible
  params.delete('token');
  const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.replaceState({}, '', clean);

  return { token, role };
}
