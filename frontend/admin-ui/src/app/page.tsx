import Topbar from "@/components/Topbar";

export default function Home() {
  return (
    <div className="animate-fade-in">
      <Topbar title="Dashboard Overview" />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Total Colleges</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>1</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Total Departments</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>3</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Active Courses</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>12</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Total Students</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>1,240</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Recent Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {[
            { action: 'Course Created', desc: 'Introduction to Node.js was created', time: '10 mins ago' },
            { action: 'College Added', desc: 'Engineering College of Tech', time: '1 hour ago' },
            { action: 'Trainer Assigned', desc: 'Prof. Smith assigned to CS101', time: '3 hours ago' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: i < 2 ? '1px solid var(--panel-border)' : 'none' }}>
              <div>
                <h4 style={{ fontSize: '16px', margin: 0 }}>{item.action}</h4>
                <p style={{ fontSize: '14px', margin: '5px 0 0 0' }}>{item.desc}</p>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
