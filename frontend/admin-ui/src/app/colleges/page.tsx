'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import CreateCollegeModal from "@/components/CreateCollegeModal";
import { fetchApi } from "@/lib/api";

export default function CollegesPage() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadColleges = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/colleges');
      setColleges(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, []);

  return (
    <div className="animate-fade-in">
      <Topbar title="Colleges Management" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>All Colleges</h3>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add College</button>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Name</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Subdomain</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Created By</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : colleges.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No colleges found.</td></tr>
            ) : (
              colleges.map((college) => (
                <tr key={college.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{college.name}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{college.subdomain}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{college.created_by}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85em' }}>{college.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateCollegeModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            loadColleges();
          }} 
        />
      )}
    </div>
  );
}
