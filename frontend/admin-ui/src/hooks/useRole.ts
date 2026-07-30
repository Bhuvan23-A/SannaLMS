'use client';
import { useState, useEffect } from 'react';

export function useRole() {
  const [role, setRole] = useState<string>('SUPER_ADMIN'); // Default to prevent flashing

  useEffect(() => {
    // Read from localStorage on mount and when it changes
    const currentRole = localStorage.getItem('mockRole') || 'SUPER_ADMIN';
    setRole(currentRole);

    // To handle role changes from Topbar simulate role dropdown
    const handleStorageChange = () => {
      setRole(localStorage.getItem('mockRole') || 'SUPER_ADMIN');
    };
    
    // Custom event since we change it in Topbar
    window.addEventListener('roleChanged', handleStorageChange);
    return () => window.removeEventListener('roleChanged', handleStorageChange);
  }, []);

  const isAdmin = role === 'SUPER_ADMIN' || role === 'COLLEGE_ADMIN';
  const isStudent = role === 'STUDENT';
  const isTrainer = role === 'PRIMARY_TRAINER' || role === 'TEACHING_ASSISTANT';

  return { role, isAdmin, isStudent, isTrainer };
}
