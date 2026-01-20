'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

export default function MyReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      const apiUrl = getApiUrl();

      fetch(`${apiUrl}/api/reports/user/${userData.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setReports(data);
          setLoading(false);
        });
    }
  }, [router]);

  const generateReport = async () => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/reports/completion/${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${user.username}_${Date.now()}.pdf`;
      a.click();
      
      // Reload reports
      const reportsRes = await fetch(`${apiUrl}/api/reports/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reportsData = await reportsRes.json();
      setReports(reportsData);
    } else {
      alert('שגיאה ביצירת דוח');
    }
  };

  if (loading) {
    return <div className="loading">טוען דוחות...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>הדוחות שלי</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            חזור ללוח בקרה
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="card">
          <h2>דוחות השלמת קורס</h2>
          <p style={{ margin: '1rem 0', color: 'var(--muted)' }}>
            כאן תוכל לראות ולהוריד את דוחות ההשלמה שלך. הדוחות נשמרים במערכת למשך 3 שנים לפחות.
          </p>

          <button onClick={generateReport} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            צור דוח חדש
          </button>
        </div>

        {reports.length > 0 ? (
          <div style={{ marginTop: '1.5rem' }}>
            {reports.map((report) => (
              <div key={report.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>דוח השלמת קורס</h3>
                    <p style={{ color: 'var(--muted)', margin: '0.5rem 0' }}>
                      נוצר ב: {new Date(report.generated_at).toLocaleString('he-IL')}
                    </p>
                    {report.expires_at && (
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                        תפוגה: {new Date(report.expires_at).toLocaleDateString('he-IL')}
                      </p>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        const apiUrl = getApiUrl();
                        fetch(`${apiUrl}/api/reports/completion/${user?.id}`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        })
                          .then(res => res.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `report_${user?.username}_${Date.now()}.pdf`;
                            a.click();
                          });
                      }}
                      className="btn btn-primary"
                    >
                      הורד דוח
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <p>אין דוחות עדיין. לחץ על "צור דוח חדש" כדי ליצור דוח השלמת קורס.</p>
          </div>
        )}
      </div>
    </div>
  );
}



