export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Try to get role from localStorage (or default to SUPER_ADMIN for testing)
  const role = typeof window !== 'undefined' ? localStorage.getItem('mockRole') || 'SUPER_ADMIN' : 'SUPER_ADMIN';
  const userId = typeof window !== 'undefined' ? localStorage.getItem('mockUserId') || 'u-1' : 'u-1';
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('mockTenantId') || 't-1' : 't-1';

  // Route to correct microservice based on endpoint prefix
  let baseUrl = 'http://localhost:3000'; // Default: college-service / org-service

  if (
    endpoint.startsWith('/api/v1/courses') ||
    endpoint.startsWith('/api/v1/course-trainers') ||
    endpoint.startsWith('/api/v1/prerequisites') ||
    endpoint.startsWith('/api/v1/enrollments')
  ) {
    baseUrl = 'http://localhost:3001'; // course-service
  } else if (endpoint.startsWith('/api/v1/events') || endpoint.startsWith('/api/v1/calendar')) {
    baseUrl = 'http://localhost:3003'; // calendar-service
  } else if (
    endpoint.startsWith('/api/v1/notifications')
  ) {
    baseUrl = 'http://localhost:3004'; // notification-service
  } else if (
    endpoint.startsWith('/api/v1/forums') ||
    endpoint.startsWith('/api/v1/threads')
  ) {
    baseUrl = 'http://localhost:3005'; // discussion-service
  } else if (endpoint.startsWith('/api/v1/search')) {
    baseUrl = 'http://localhost:3006'; // search-service
  } else if (
    endpoint.startsWith('/api/v1/questions') ||
    endpoint.startsWith('/api/v1/quizzes') ||
    endpoint.startsWith('/api/v1/assignments') ||
    endpoint.startsWith('/api/v1/gradebook')
  ) {
    baseUrl = 'http://localhost:3007'; // assessment-service
  } else if (endpoint.startsWith('/api/v1/attendance')) {
    baseUrl = 'http://localhost:3008'; // attendance-service
  } else if (endpoint.startsWith('/api/v1/liveclasses')) {
    baseUrl = 'http://localhost:3009'; // liveclass-service
  } else if (endpoint.startsWith('/api/v1/certificates')) {
    baseUrl = 'http://localhost:3010'; // certificate-service
  } else if (endpoint.startsWith('/api/v1/chat')) {
    baseUrl = 'http://localhost:3005'; // discussion-service (chat endpoints)
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-mock-roles': role,
    'x-mock-user-id': userId,
    'x-mock-tenant-id': tenantId,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
