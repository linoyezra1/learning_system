'use client';

import { useEffect, useState } from 'react';

const HEBREW_KEYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

type ShuffledQuestion = {
  id: number;
  question: string;
  explanation?: string;
  /** Display options with fresh א/ב/ג/ד labels after shuffle */
  options: Record<string, string>;
  /** Maps display key (א) → original DB key (might also be א, or ב, etc.) */
  displayToOriginal: Record<string, string>;
  /** Maps original DB key → display key */
  originalToDisplay: Record<string, string>;
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle option texts and re-label as א, ב, ג… so the correct answer is not always א. */
function shuffleQuestionOptions(raw: any): ShuffledQuestion | null {
  if (!raw || raw.id == null) return null;

  let options: Record<string, string> = {};
  try {
    options =
      typeof raw.options === 'string' ? JSON.parse(raw.options) : raw.options || {};
  } catch {
    options = {};
  }

  const entries = Object.entries(options).filter(
    ([, value]) => value != null && String(value).trim() !== ''
  );
  if (entries.length === 0) {
    return {
      id: raw.id,
      question: raw.question,
      explanation: raw.explanation,
      options: {},
      displayToOriginal: {},
      originalToDisplay: {},
    };
  }

  const shuffled = shuffleArray(entries);
  const displayOptions: Record<string, string> = {};
  const displayToOriginal: Record<string, string> = {};
  const originalToDisplay: Record<string, string> = {};

  shuffled.forEach(([originalKey, value], index) => {
    const displayKey = HEBREW_KEYS[index] || String(index + 1);
    displayOptions[displayKey] = String(value);
    displayToOriginal[displayKey] = originalKey;
    originalToDisplay[originalKey] = displayKey;
  });

  return {
    id: raw.id,
    question: raw.question,
    explanation: raw.explanation,
    options: displayOptions,
    displayToOriginal,
    originalToDisplay,
  };
}

export default function PracticeQuestions({ slideId }: { slideId: number }) {
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [results, setResults] = useState<{ [key: number]: any }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setAnswers({});
    setResults({});

    fetch(`/api/questions?slideId=${slideId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const shuffled = list
          .map(shuffleQuestionOptions)
          .filter((q): q is ShuffledQuestion => q != null);
        setQuestions(shuffled);
        setLoading(false);
      })
      .catch(() => {
        setQuestions([]);
        setLoading(false);
      });
  }, [slideId]);

  const handleAnswer = async (question: ShuffledQuestion, displayKey: string) => {
    const originalKey = question.displayToOriginal[displayKey] || displayKey;
    setAnswers((prev) => ({ ...prev, [question.id]: displayKey }));

    const token = localStorage.getItem('token');
    const response = await fetch(`/api/questions/${question.id}/answer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answer: originalKey }),
    });

    const data = await response.json();
    const displayCorrect =
      (data.correctAnswer && question.originalToDisplay[data.correctAnswer]) ||
      data.correctAnswer;

    setResults((prev) => ({
      ...prev,
      [question.id]: {
        ...data,
        correctAnswer: displayCorrect,
      },
    }));

    requestAnimationFrame(() => {
      const el = document.getElementById(`quiz-feedback-${question.id}`);
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
        {questions.map((question) => {
          const answer = answers[question.id];
          const result = results[question.id];

          return (
            <div
              key={question.id}
              style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)' }}
            >
              <h4 style={{ marginBottom: '1rem', fontSize: 'clamp(1rem, 3.5vw, 1.15rem)' }}>
                {question.question}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(question.options).map(([key, value]) => {
                  const selected = answer === key;
                  const stateClass = selected
                    ? result?.correct
                      ? 'correct'
                      : result
                        ? 'incorrect'
                        : ''
                    : result && result.correctAnswer === key
                      ? 'correct'
                      : '';
                  return (
                    <label key={key} className={`quiz-option ${stateClass}`}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={key}
                        checked={selected}
                        onChange={() => !result && handleAnswer(question, key)}
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
                      {result.explanation && (
                        <div style={{ marginTop: '0.5rem' }}>{result.explanation}</div>
                      )}
                    </div>
                  ) : (
                    <div className="error">
                      ✗ תשובה שגויה. התשובה הנכונה היא: {result.correctAnswer}
                      {result.explanation && (
                        <div style={{ marginTop: '0.5rem' }}>{result.explanation}</div>
                      )}
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
