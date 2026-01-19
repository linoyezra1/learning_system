'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user && (data.user.role === 'instructor' || data.user.role === 'admin')) {
          setUser(data.user);
          setLoading(false);
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'רק קבצי Excel מותרים (.xlsx, .xls)' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/users/update-from-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const resultText = `עודכנו ${data.results.updated} משתמשים, נוצרו ${data.results.created} משתמשים חדשים. סה"כ: ${data.results.total}`;
        const errorsText = data.results.errors && data.results.errors.length > 0
          ? `\nשגיאות: ${data.results.errors.join(', ')}`
          : '';
        setMessage({ type: 'success', text: resultText + errorsText });
      } else {
        setMessage({ type: 'error', text: data.error || 'שגיאה בעדכון משתמשים' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בהעלאת הקובץ' });
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSyncFromFile = async () => {
    setSyncing(true);
    setMessage(null);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/users/sync-from-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        const resultText = `עודכנו ${data.results.updated} משתמשים, נוצרו ${data.results.created} משתמשים חדשים. סה"כ: ${data.results.total}`;
        const errorsText = data.results.errors && data.results.errors.length > 0
          ? `\nשגיאות: ${data.results.errors.join(', ')}`
          : '';
        setMessage({ type: 'success', text: resultText + errorsText });
      } else {
        setMessage({ type: 'error', text: data.error || 'שגיאה בסנכרון משתמשים' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'שגיאה בסנכרון מהקובץ' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="loading">טוען...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>ניהול משתמשים מקובץ Excel</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            חזור ללוח בקרה
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="card">
          <h2>עדכון משתמשים מקובץ Excel</h2>
          <p style={{ margin: '1rem 0', color: 'var(--muted)' }}>
            העלה קובץ Excel (users.xlsx) עם עמודות: <strong>username</strong> ו-<strong>password</strong>
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            <h3>אפשרות 1: העלאת קובץ</h3>
            <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#f9f9f9', borderRadius: '8px' }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ marginBottom: '1rem' }}
              />
              {uploading && <p style={{ color: 'var(--muted)' }}>מעדכן משתמשים...</p>}
            </div>

            <h3 style={{ marginTop: '2rem' }}>אפשרות 2: סנכרון מקובץ users.xlsx</h3>
            <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>
              המערכת תקרא את הקובץ users.xlsx מתיקיית הפרויקט
            </p>
            <button
              onClick={handleSyncFromFile}
              disabled={syncing}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              {syncing ? 'מסנכרן...' : 'סנכרן מקובץ users.xlsx'}
            </button>
          </div>

          {message && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                borderRadius: '8px',
                border: `2px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                whiteSpace: 'pre-line'
              }}
            >
              <strong>{message.type === 'success' ? '✓ הצלחה:' : '✗ שגיאה:'}</strong>
              <div style={{ marginTop: '0.5rem' }}>{message.text}</div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2>הוראות</h2>
          <ul style={{ marginTop: '1rem', paddingRight: '1.5rem', lineHeight: '2' }}>
            <li>הקובץ חייב להכיל <strong>רק שתי עמודות</strong>: <code>username</code> ו-<code>password</code></li>
            <li>שורה ראשונה היא כותרות העמודות</li>
            <li>משתמשים קיימים יתעדכנו לפי שם המשתמש (username)</li>
            <li>משתמשים חדשים יתווספו אוטומטית</li>
            <li>הסיסמאות יעברו hash אוטומטית לפני שמירה</li>
            <li>משתמשים חדשים יקבלו role: student כברירת מחדל</li>
          </ul>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2>דוגמה לקובץ Excel</h2>
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr style={{ background: 'var(--brand-cream)' }}>
                  <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>username</th>
                  <th style={{ padding: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>password</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)' }}>admin</td>
                  <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)' }}>admin123</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)' }}>student1</td>
                  <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)' }}>student123</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)' }}>newuser</td>
                  <td style={{ padding: '0.75rem', border: '1px solid var(--border-color)' }}>newpass123</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



