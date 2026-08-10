'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * People resolver: loads the user directory for the caller's scope (all users
 * for super admin, own college for college admin/trainer) and provides
 * id -> name/email lookups. Replaces raw UUIDs in every list UI.
 */
export function useUserDirectory() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchApi('/api/v1/users').catch(() => []);
        if (!cancelled && Array.isArray(data)) setUsers(data);
      } catch { /* directory unavailable */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const byId = useCallback(() => {
    const map: Record<string, any> = {};
    users.forEach((u: any) => { if (u.id) map[u.id] = u; });
    return map;
  }, [users]);

  const nameOf = useCallback((id?: string | null) => {
    if (!id) return '—';
    const u = byId()[id];
    if (!u) return id; // fall back to the raw id when unknown
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return full || u.email || id;
  }, [byId]);

  const emailOf = useCallback((id?: string | null) => {
    if (!id) return '';
    return byId()[id]?.email || '';
  }, [byId]);

  return { users, loading, byId, nameOf, emailOf };
}
