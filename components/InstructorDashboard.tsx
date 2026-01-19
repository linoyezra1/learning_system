'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InstructorDashboard({ user }: { user: any }) {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Fetch all students
    fetch('/api/progress/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStudents(data));

    // Fetch pending questions
    fetch('/api/questions/all-questions?status=pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setPendingQuestions(data);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const generateReport = async (userId: number) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/reports/completion/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${userId}_${Date.now()}.pdf`;
      a.click();
    } else {
      alert('שגיאה ביצירת דוח');
    }
  };

  if (loading) {
    return <div className="loading">טוען...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>פאנל מדריך</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span>שלום, {user.fullName}</span>
            <button onClick={handleLogout} className="btn btn-secondary">התנתק</button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        {/* Pending Questions */}
        {pendingQuestions.length > 0 && (
          <div className="card" style={{ border: '2px solid var(--warning)' }}>
            <h2 style={{ color: 'var(--warning)' }}>
              שאלות ממתינות לתשובה ({pendingQuestions.length})
            </h2>
            <div style={{ marginTop: '1rem' }}>
              {pendingQuestions.slice(0, 5).map((q: any) => (
                <div key={q.id} style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{q.student_name}</div>
                  <div>{q.question}</div>
                  {q.slide_title && <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>שקף: {q.slide_title}</div>}
                </div>
              ))}
              <Link href="/questions" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                צפה בכל השאלות
              </Link>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="card">
          <h2>רשימת תלמידים</h2>
          <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--brand-cream)', borderBottom: '2px solid var(--brand-deep)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>שם מלא</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>שם משתמש</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>אחוז השלמה</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>שקפים</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>זמן</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: any) => {
                  const completion = student.total_slides > 0
                    ? ((student.completed_slides / student.total_slides) * 100).toFixed(1)
                    : 0;

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{student.full_name}</td>
                      <td style={{ padding: '0.75rem' }}>{student.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                        {completion}%
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {student.completed_slides || 0} / {student.total_slides || 0}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {Math.floor((student.total_time_spent || 0) / 60)} דק'
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => generateReport(student.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                          צור דוח
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation */}
        <div className="card">
          <h2>פעולות נוספות</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link href="/questions" className="btn btn-secondary">כל השאלות מתלמידים</Link>
            <Link href="/manage-users" className="btn btn-secondary">ניהול משתמשים מקובץ Excel</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

