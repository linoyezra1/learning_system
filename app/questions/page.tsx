'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Get user info
    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          loadQuestions(data.user.role, token);
        } else {
          router.push('/');
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const loadQuestions = (role: string, token: string) => {
    if (role === 'instructor' || role === 'admin') {
      // Instructor: Load all questions
      fetch('/api/questions/all-questions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setQuestions(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      // Student: Load only their questions
      fetch('/api/questions/my-questions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setQuestions(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  };

  const handleAnswerSubmit = async (questionId: number) => {
    if (!answerText.trim()) {
      alert('נא להזין תשובה');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/questions/${questionId}/answer-instructor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer: answerText })
      });

      const data = await response.json();

      if (response.ok) {
        // Reload questions to get updated status
        loadQuestions(user!.role, token!);
        setEditingQuestionId(null);
        setAnswerText('');
      } else {
        alert(data.error || 'שגיאה בשמירת התשובה');
      }
    } catch (error) {
      alert('שגיאה בחיבור לשרת');
    } finally {
      setSubmitting(false);
    }
  };

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  if (loading) {
    return <div className="loading">טוען שאלות...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{isInstructor ? 'כל השאלות מתלמידים' : 'השאלות שלי למדריך'}</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            חזור ללוח בקרה
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        {questions.length > 0 ? (
          questions.map((q) => (
            <div key={q.id} className="card" style={{ marginBottom: '1.5rem' }}>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  {isInstructor && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>תלמיד: </strong>{q.student_name || q.full_name || q.username}
                    </div>
                  )}
                  <h3 style={{ margin: '0.5rem 0' }}>שאלה:</h3>
                  <p style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>{q.question}</p>
                </div>
                <div style={{ textAlign: 'left', marginRight: '1rem' }}>
                  {q.status === 'pending' ? (
                    <span style={{ padding: '0.5rem 1rem', background: '#fff3e0', borderRadius: '8px', color: 'var(--warning)', fontWeight: 'bold' }}>
                      ממתינה לתשובה
                    </span>
                  ) : (
                    <span style={{ padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '8px', color: 'var(--success)', fontWeight: 'bold' }}>
                      נענתה
                    </span>
                  )}
                </div>
              </div>

              {/* Question Context */}
              {q.slide_title && (
                <div style={{ color: 'var(--muted)', marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '8px' }}>
                  <strong>נושא: </strong>{q.module_title || ''} {q.slide_title && `- ${q.slide_title}`}
                </div>
              )}

              <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                נשלחה: {new Date(q.created_at).toLocaleString('he-IL')}
              </div>

              {/* Answer Section */}
              {q.answer ? (
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--brand-cream)', borderRadius: '8px', border: '2px solid var(--brand-deep)' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--brand-deep)' }}>
                    {isInstructor ? 'תשובתך:' : 'תשובת המדריך:'}
                  </h4>
                  <p style={{ fontSize: '1.05rem', lineHeight: '1.8' }}>{q.answer}</p>
                  {q.answered_at && (
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                      נענתה: {new Date(q.answered_at).toLocaleString('he-IL')}
                    </p>
                  )}
                </div>
              ) : (
                isInstructor && (
                  <div style={{ marginTop: '1.5rem' }}>
                    {editingQuestionId === q.id ? (
                      <div style={{ padding: '1.5rem', background: '#f9f9f9', borderRadius: '8px', border: '2px solid var(--brand-deep)' }}>
                        <h4 style={{ marginBottom: '1rem' }}>תשובה:</h4>
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={6}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                          placeholder="הזן את תשובתך..."
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            onClick={() => handleAnswerSubmit(q.id)}
                            disabled={submitting || !answerText.trim()}
                            className="btn btn-primary"
                          >
                            {submitting ? 'שולח...' : 'שלח תשובה'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingQuestionId(null);
                              setAnswerText('');
                            }}
                            disabled={submitting}
                            className="btn btn-secondary"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingQuestionId(q.id);
                          setAnswerText('');
                        }}
                        className="btn btn-primary"
                      >
                        הוסף תשובה
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Student view - if answered */}
              {!isInstructor && !q.answer && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>השאלה ממתינה לתשובת המדריך</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card">
            <p>
              {isInstructor 
                ? 'אין שאלות להצגה כרגע.' 
                : 'אין שאלות להצגה. תוכל לשאול שאלות במהלך הצפייה בשקפים.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
