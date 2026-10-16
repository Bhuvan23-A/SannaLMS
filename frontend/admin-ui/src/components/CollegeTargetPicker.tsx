'use client';
import { useColleges } from '@/hooks/useColleges';

/**
 * College targeting picker for super admins.
 *
 * - Non-super-admins: renders nothing (their content is automatically scoped
 *   to their own college).
 * - Super admins: choose which colleges an event / forum / chat room is
 *   visible in. `value` is a list of tenant_ids, or ['__ALL__'] to broadcast
 *   to every active college.
 */
export default function CollegeTargetPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const { isSuperAdmin, activeColleges } = useColleges();
  if (!isSuperAdmin) return null;

  const allSelected = value.includes('__ALL__');

  const toggleAll = () => {
    onChange(allSelected ? [] : ['__ALL__']);
  };

  const toggleCollege = (tenantId: string) => {
    const rest = value.filter((t) => t !== '__ALL__');
    onChange(rest.includes(tenantId) ? rest.filter((t) => t !== tenantId) : [...rest, tenantId]);
  };

  return (
    <div style={{ marginTop: '4px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
        <span>🏛️</span> Target Audience / Colleges {allSelected ? <span style={{ color: '#38bdf8', fontSize: '12px' }}>(Broadcasting to All)</span> : ''}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <label
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            padding: '7px 12px', borderRadius: '6px',
            background: allSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: allSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
            color: allSelected ? '#ffffff' : '#cbd5e1',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.15s ease'
          }}
        >
          <input 
            type="checkbox" 
            checked={allSelected} 
            onChange={toggleAll} 
            style={{ accentColor: '#38bdf8', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          🌐 All Colleges
        </label>
        {activeColleges.map((c: any) => {
          const isSelected = value.includes(c.tenant_id);
          return (
            <label
              key={c.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                padding: '7px 12px', borderRadius: '6px',
                background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                color: isSelected ? '#ffffff' : '#cbd5e1',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCollege(c.tenant_id)}
                style={{ accentColor: '#38bdf8', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              🏛️ {c.name}
            </label>
          );
        })}
        {activeColleges.length === 0 && (
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>
            No active colleges yet.
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', marginBottom: 0 }}>
        💡 Leave unselected to restrict visibility to your own institutional workspace.
      </p>
    </div>
  );
}
