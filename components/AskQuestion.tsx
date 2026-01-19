'use client';

import { useState } from 'react';

export default function AskQuestion({ slideId }: { slideId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/questions/ask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ slideId, question })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('השאלה נשלחה למדריך בהצלחה');
        setQuestion('');
        setShowForm(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'שגיאה בשליחת השאלה');
      }
    } catch (err) {
      setMessage('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn btn-secondary"
      >
        שאל את המדריך
      </button>

      {message && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: message.includes('הצלחה') ? '#e8f5e9' : '#ffebee', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '2px solid var(--brand-deep)' }}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              שאלתך למדריך:
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="הזן את שאלתך..."
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'שולח...' : 'שלח שאלה'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

