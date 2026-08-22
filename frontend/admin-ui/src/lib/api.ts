// All API requests go through Kong Gateway → NGINX proxies /api/ → Kong → correct microservice
// In production: relative /api/v1 is proxied by NGINX to Kong at sannalms-kong:8000
// In local dev: use NEXT_PUBLIC_API_URL env var pointing to http://localhost:8010/api/v1

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Get auth context from localStorage (populated after Keycloak login)
  const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'SUPER_ADMIN' : 'SUPER_ADMIN';
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
  };

  // For multipart uploads (e.g. PDF import) let the browser set the Content-Type boundary
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (isFormData) {
    delete defaultHeaders['Content-Type'];
  }

  // Attach Bearer token if available (from Keycloak)
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    // Fallback mock headers for development testing
    defaultHeaders['x-mock-roles'] = role;
    defaultHeaders['x-mock-user-id'] = userId || 'u-1';
    defaultHeaders['x-mock-tenant-id'] = tenantId || 't-1';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const base = errorData.message || `API Error: ${response.status} ${response.statusText}`;
    // Give users a real hint instead of a cryptic "403 Forbidden" — this is
    // almost always a role/permission mismatch or an expired session (#fix).
    if (response.status === 403) {
      throw new Error(`${base} — you don't have permission to do this (your role may not allow it)`);
    }
    if (response.status === 401) {
      throw new Error(`${base} — your session may have expired. Please log in again.`);
    }
    throw new Error(base);
  }

  return response.json();
}

export async function downloadFile(endpoint: string, fallbackFilename = 'report.csv') {
  const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'SUPER_ADMIN' : 'SUPER_ADMIN';
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : '';
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';

  const defaultHeaders: Record<string, string> = {
    'X-Tenant-ID': tenantId,
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    defaultHeaders['x-mock-roles'] = role;
    defaultHeaders['x-mock-user-id'] = userId || 'u-1';
    defaultHeaders['x-mock-tenant-id'] = tenantId || 't-1';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: defaultHeaders,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
