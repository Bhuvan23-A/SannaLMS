'use client';

import { useState, useRef, useEffect } from 'react';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import { Search, UserCheck, X, Check } from 'lucide-react';

interface UserSearchPickerProps {
  value: string;
  onChange: (userId: string, user?: any) => void;
  roleFilter?: string | string[];
  placeholder?: string;
  collegeId?: string;
}

export default function UserSearchPicker({
  value,
  onChange,
  roleFilter,
  placeholder = 'Search by name, email, or roll number...',
}: UserSearchPickerProps) {
  const { users, loading, nameOf, emailOf } = useUserDirectory();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUser = users.find(u => u.id === value);

  const filteredUsers = users.filter(u => {
    // Role filter
    if (roleFilter) {
      const allowedRoles = Array.isArray(roleFilter) ? roleFilter.map(r => r.toUpperCase()) : [roleFilter.toUpperCase()];
      const uRole = (u.role || '').toUpperCase();
      if (!allowedRoles.includes(uRole)) return false;
    }

    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const nameMatch = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {value && selectedUser ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(14, 165, 233, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '8px',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {nameOf(value)}
              </div>
              <div style={{ fontSize: '11px', color: '#7dd3fc' }}>
                {emailOf(value)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            style={{ width: '100%', paddingLeft: '36px', fontSize: '13px' }}
            placeholder={placeholder}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          />
        </div>
      )}

      {/* Dropdown List */}
      {isOpen && !value && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          maxHeight: '220px',
          overflowY: 'auto',
          background: '#0a192f',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
          zIndex: 50,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)',
          padding: '4px'
        }}>
          {loading ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {query ? `No matching people found for "${query}"` : 'No eligible users found'}
            </div>
          ) : (
            filteredUsers.slice(0, 15).map(u => {
              const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    onChange(u.id, u);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{fullName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase'
                  }}>
                    {u.role || 'user'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
