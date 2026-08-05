// Shared auth helpers for the admin UI.

export const KEYCLOAK_LOGOUT_URL =
  'https://sannalms.sannainnovations.com/auth/realms/sannalms/protocol/openid-connect/logout?post_logout_redirect_uri=' +
  encodeURIComponent('__ORIGIN__') +
  '&client_id=sannalms-client';

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
  localStorage.clear();
  const logoutUrl = KEYCLOAK_LOGOUT_URL.replace('__ORIGIN__', window.location.origin);
  window.location.href = logoutUrl;
}
