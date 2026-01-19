'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [progress, setProgress] = useState<any>(null);
  const [detailedProgress, setDetailedProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Fetch progress
    fetch('/api/progress/my-progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setProgress(data));

    // Fetch detailed progress
    fetch('/api/progress/my-progress/detailed', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setDetailedProgress(data);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return <div className="loading">טוען...</div>;
  }

  const completionPercentage = progress && progress.total_slides > 0
    ? ((progress.completed_slides / progress.total_slides) * 100).toFixed(1)
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>פאנל סטודנט</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>שלום, {user.fullName}</span>
            <button onClick={handleLogout} className="btn btn-secondary">התנתק</button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        {/* Progress Summary */}
        <div className="card">
          <h2>סיכום התקדמות</h2>
          {progress ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--brand-deep)' }}>
                  {completionPercentage}%
                </div>
                <div style={{ color: 'var(--muted)' }}>אחוז השלמה</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--brand-deep)' }}>
                  {progress.completed_slides} / {progress.total_slides}
                </div>
                <div style={{ color: 'var(--muted)' }}>שקפים הושלמו</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--brand-deep)' }}>
                  {Math.floor((progress.total_time_spent || 0) / 60)}
                </div>
                <div style={{ color: 'var(--muted)' }}>דקות נלמדו</div>
              </div>
            </div>
          ) : (
            <p>אין התקדמות עדיין</p>
          )}
        </div>

        {/* Course Link */}
        <div className="card">
          <h2>קורס עזרה ראשונה - חוברת 44</h2>
          <p style={{ margin: '1rem 0' }}>קורס מקיף בעזרה ראשונה לפי חוברת 44</p>
          <Link href="/course/1" className="btn btn-primary">
            התחל/המשך לימוד
          </Link>
        </div>

        {/* Detailed Progress */}
        {detailedProgress.length > 0 && (
          <div className="card">
            <h2>התקדמות לפי נושאים</h2>
            <div style={{ marginTop: '1.5rem' }}>
              {detailedProgress.map((module: any) => {
                const moduleCompletion = module.total_slides > 0
                  ? ((module.completed_slides / module.total_slides) * 100).toFixed(1)
                  : 0;

                return (
                  <div key={module.module_id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3>{module.module_title}</h3>
                      <span style={{ fontWeight: 'bold', color: 'var(--brand-deep)' }}>{moduleCompletion}%</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                      {module.completed_slides} מתוך {module.total_slides} שקפים הושלמו
                      {module.time_spent && ` • ${Math.floor(module.time_spent / 60)} דקות`}
                    </div>
                    <div style={{ marginTop: '0.5rem', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${moduleCompletion}%`,
                          background: 'var(--brand-deep)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="card">
          <h2>פעולות נוספות</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link href="/questions" className="btn btn-secondary">השאלות שלי למדריך</Link>
            <Link href="/materials" className="btn btn-secondary">חומרי לימוד להורדה</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

