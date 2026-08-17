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
        setQuestions(Array.isArray(data) ? data : []);
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

    requestAnimationFrame(() => {
      const el = document.getElementById(`quiz-feedback-${questionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
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
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((question: any) => {
          let options: Record<string, string> = {};
          try {
            options = typeof question.options === 'string' ? JSON.parse(question.options) : (question.options || {});
          } catch {
            options = {};
          }
          const answer = answers[question.id];
          const result = results[question.id];

          return (
            <div key={question.id} style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: 'clamp(1rem, 3.5vw, 1.15rem)' }}>{question.question}</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(options).map(([key, value]: [string, any]) => {
                  const selected = answer === key;
                  const stateClass = selected
                    ? (result?.correct ? 'correct' : result ? 'incorrect' : '')
                    : '';
                  return (
                    <label
                      key={key}
                      className={`quiz-option ${stateClass}`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={key}
                        checked={selected}
                        onChange={() => !result && handleAnswer(question.id, key)}
                      />
                      <span>
                        <strong>{key}.</strong> {value}
                      </span>
                    </label>
                  );
                })}
              </div>

              {result && (
                <div id={`quiz-feedback-${question.id}`} className="quiz-feedback">
                  {result.correct ? (
                    <div className="success">
                      ✓ תשובה נכונה!
                      {result.explanation && <div style={{ marginTop: '0.5rem' }}>{result.explanation}</div>}
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
