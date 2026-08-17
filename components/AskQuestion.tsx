'use client';

import { useState } from 'react';

export default function AskQuestion({ slideId, fab = false }: { slideId: number; fab?: boolean }) {
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

  const form = (
    <form onSubmit={handleSubmit} className="chat-composer">
      <label style={{ display: 'block', fontWeight: 500 }}>
        שאלתך למדריך:
      </label>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        required
        rows={4}
        placeholder="הזן את שאלתך..."
        style={{ fontSize: 16 }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'שולח...' : 'שלח שאלה'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
          ביטול
        </button>
      </div>
    </form>
  );

  if (fab) {
    return (
      <>
        <button
          type="button"
          className="fab-chat"
          aria-label="שאל את המדריך"
          onClick={() => setShowForm(true)}
        >
          שאל מדריך
        </button>
        {message && !showForm && (
          <div className="fab-chat" style={{ bottom: 'calc(var(--sticky-nav-height) + var(--safe-bottom) + 4.5rem)', width: 'auto', borderRadius: 12, padding: '0.5rem 0.75rem' }}>
            {message}
          </div>
        )}
        {showForm && (
          <>
            <div className="sheet-backdrop" onClick={() => setShowForm(false)} />
            <div className="bottom-sheet" role="dialog" aria-label="שאלה למדריך">
              <div className="sheet-handle" />
              <h3 style={{ marginBottom: '0.75rem' }}>שאלה למדריך</h3>
              {message && <div className={message.includes('הצלחה') ? 'success' : 'error'}>{message}</div>}
              {form}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn btn-secondary"
      >
        שאל את המדריך
      </button>

      {message && (
        <div className={message.includes('הצלחה') ? 'success' : 'error'} style={{ marginTop: '0.5rem' }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '2px solid var(--brand-deep)' }}>
          {form}
        </div>
      )}
    </div>
  );
}
