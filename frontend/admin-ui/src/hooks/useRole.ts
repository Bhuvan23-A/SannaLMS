'use client';
import { useState, useEffect } from 'react';

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function useRole() {
  const [role, setRole] = useState<string>('SUPER_ADMIN'); // Default to prevent flashing

  useEffect(() => {
    const updateRole = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = decodeJwt(token);
        if (payload) {
          const roles = payload.realm_access?.roles || [];
          const rawRoles = Array.isArray(roles) ? roles : [];
          const lowerRoles = rawRoles.map((r: any) => String(r).toLowerCase());
          if (lowerRoles.includes('superadmin') || lowerRoles.includes('super_admin')) {
            setRole('SUPER_ADMIN');
            return;
          } else if (lowerRoles.includes('tenantadmin') || lowerRoles.includes('tenant_admin') || lowerRoles.includes('college_admin')) {
            setRole('COLLEGE_ADMIN');
            return;
          } else if (lowerRoles.includes('instructor') || lowerRoles.includes('trainer') || lowerRoles.includes('faculty') || lowerRoles.includes('primary_trainer')) {
            setRole('PRIMARY_TRAINER');
            return;
          } else if (lowerRoles.includes('teaching_assistant') || lowerRoles.includes('ta')) {
            setRole('TEACHING_ASSISTANT');
            return;
          } else if (lowerRoles.includes('student')) {
            setRole('STUDENT');
            return;
          }
        }
      }
      setRole(localStorage.getItem('mockRole') || 'SUPER_ADMIN');
    };

    updateRole();
    
    // To handle role changes
    window.addEventListener('roleChanged', updateRole);
    return () => window.removeEventListener('roleChanged', updateRole);
  }, []);

  const isAdmin = role === 'SUPER_ADMIN' || role === 'COLLEGE_ADMIN';
  const isStudent = role === 'STUDENT';
  const isTrainer = role === 'PRIMARY_TRAINER' || role === 'TEACHING_ASSISTANT' || role === 'INSTRUCTOR' || role === 'TRAINER' || role === 'FACULTY';

  return { role, isAdmin, isStudent, isTrainer };
}
