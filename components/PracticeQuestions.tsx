'use client';

import { useEffect, useState } from 'react';

export default function PracticeQuestions({ slideId }: { slideId: number }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [results, setResults] = useState<{ [key: number]: any }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/questions?slideId=${slideId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        setLoading(false);
      });
  }, [slideId]);

  const handleAnswer = async (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    const token = localStorage.getItem('token');
    const response = await fetch(`/api/questions/${questionId}/answer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answer })
    });

    const data = await response.json();
    setResults(prev => ({ ...prev, [questionId]: data }));
  };

  if (loading) {
    return <div className="loading">טוען שאלות...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="card">
        <p>אין שאלות תרגול לשקף זה</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>שאלות תרגול עצמי</h3>
      <div style={{ marginTop: '1.5rem' }}>
        {questions.map((question: any) => {
          const options = JSON.parse(question.options);
          const answer = answers[question.id];
          const result = results[question.id];

          return (
            <div key={question.id} style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ marginBottom: '1rem' }}>{question.question}</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(options).map(([key, value]: [string, any]) => (
                  <label
                    key={key}
                    style={{
                      padding: '0.75rem',
                      border: '2px solid',
                      borderColor: answer === key
                        ? result?.correct
                          ? 'var(--success)'
                          : 'var(--error)'
                        : 'var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: answer === key
                        ? result?.correct
                          ? '#e8f5e9'
                          : '#ffebee'
                        : 'white',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={key}
                      checked={answer === key}
                      onChange={() => !result && handleAnswer(question.id, key)}
                      style={{ marginLeft: '0.5rem' }}
                    />
                    {key}: {value}
                  </label>
                ))}
              </div>

              {result && (
                <div style={{ marginTop: '1rem' }}>
                  {result.correct ? (
                    <div className="success">
                      ✓ תשובה נכונה! {result.explanation && <div style={{ marginTop: '0.5rem' }}>{result.explanation}</div>}
                    </div>
                  ) : (
                    <div className="error">
                      ✗ תשובה שגויה. התשובה הנכונה היא: {result.correctAnswer}
                      {result.explanation && <div style={{ marginTop: '0.5rem' }}>{result.explanation}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

