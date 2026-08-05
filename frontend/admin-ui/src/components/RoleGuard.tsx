'use client';
import Link from 'next/link';
import { useRole } from '@/hooks/useRole';
import { getRoleLabel } from '@/lib/auth';

/**
 * Client-side route guard: renders children only when the current role is in
 * `allowedRoles`. Otherwise renders an access-denied panel. Backend guards
 * (RolesGuard + @Roles) remain the source of truth for enforcement.
 */
export default function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { role } = useRole();

  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '460px' }}>
        <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
        <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Access Restricted</h3>
        <p style={{ fontSize: '14px', margin: '0 0 22px', lineHeight: 1.6 }}>
          This section is available only to <strong>{allowedRoles.map(getRoleLabel).join(' / ')}</strong>.
          Your current role (<strong>{getRoleLabel(role)}</strong>) doesn&apos;t have permission to view it.
        </p>
        <Link
          href="/"
          className="btn-primary"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
