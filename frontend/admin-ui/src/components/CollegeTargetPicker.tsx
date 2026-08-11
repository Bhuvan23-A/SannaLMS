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
    <div style={{ marginTop: '10px' }}>
      <label style={{ display: 'block', marginBottom: '5px' }}>
        Visible To Colleges {allSelected ? '(All Colleges)' : ''}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,200,255,0.08)',
            border: '1px solid rgba(0,200,255,0.3)',
          }}
        >
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          All Colleges
        </label>
        {activeColleges.map((c: any) => (
          <label
            key={c.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              padding: '6px 10px', borderRadius: '6px',
              background: value.includes(c.tenant_id) ? 'rgba(0,200,255,0.08)' : 'transparent',
              border: value.includes(c.tenant_id) ? '1px solid rgba(0,200,255,0.3)' : '1px solid var(--border-color, #333)',
            }}
          >
            <input
              type="checkbox"
              checked={value.includes(c.tenant_id)}
              onChange={() => toggleCollege(c.tenant_id)}
            />
            {c.name}
          </label>
        ))}
        {activeColleges.length === 0 && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            No active colleges yet.
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
        Leave empty to keep it in your own workspace only.
      </p>
    </div>
  );
}
