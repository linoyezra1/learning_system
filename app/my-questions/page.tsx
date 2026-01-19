'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MyQuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetch('/api/questions/my-questions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return <div className="loading">טוען שאלות...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>השאלות שלי למדריך</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            חזור ללוח בקרה
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        {questions.length > 0 ? (
          questions.map((q) => (
            <div key={q.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <h3>שאלתך:</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{q.question}</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  {q.status === 'pending' ? (
                    <span style={{ padding: '0.5rem 1rem', background: '#fff3e0', borderRadius: '8px', color: 'var(--warning)' }}>
                      ממתינה לתשובה
                    </span>
                  ) : (
                    <span style={{ padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '8px', color: 'var(--success)' }}>
                      נענתה
                    </span>
                  )}
                </div>
              </div>

              {q.slide_title && (
                <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  נושא: {q.module_title} - {q.slide_title}
                </p>
              )}

              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                נשלחה: {new Date(q.created_at).toLocaleString('he-IL')}
              </p>

              {q.answer && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--brand-cream)', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>תשובת המדריך:</h4>
                  <p>{q.answer}</p>
                  {q.answered_at && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                      נענתה: {new Date(q.answered_at).toLocaleString('he-IL')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card">
            <p>אין שאלות להצגה. תוכל לשאול שאלות במהלך הצפייה בשקפים.</p>
          </div>
        )}
      </div>
    </div>
  );
}

