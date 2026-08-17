'use client';

import { useEffect, useState, useRef } from 'react';
import PracticeQuestions from './PracticeQuestions';
import AskQuestion from './AskQuestion';

export default function SlideViewer({
  slide,
  slideIndex,
  totalSlides,
  moduleTitle,
  onComplete,
  canGoNext,
  onPrevious,
  hasPrevious
}: {
  slide: any;
  slideIndex: number;
  totalSlides: number;
  moduleTitle?: string;
  onComplete: () => void;
  canGoNext: boolean;
  onPrevious: () => void;
  hasPrevious: boolean;
}) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/slides/${slide.id}/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTimeSpent(data.timeSpent || 0);
        setIsCompleted(data.completed || false);
      });

    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      saveProgress();
    };
  }, [slide.id]);

  const saveProgress = async () => {
    const token = localStorage.getItem('token');
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

    await fetch(`/api/slides/${slide.id}/progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeSpent: elapsed,
        completed: isCompleted
      })
    });
  };

  const handleComplete = async () => {
    const token = localStorage.getItem('token');
    const minTime = slide.min_reading_time || 30;

    if (timeSpent < minTime) {
      alert(`עליך לקרוא את השקף לפחות ${minTime} שניות לפני מעבר לשקף הבא. נותרו עוד ${minTime - timeSpent} שניות.`);
      return;
    }

    await fetch(`/api/slides/${slide.id}/progress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeSpent: timeSpent,
        completed: true
      })
    });

    setIsCompleted(true);
    onComplete();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0 && hasPrevious) {
      onPrevious();
    } else if (dx < 0 && remainingTime === 0) {
      handleComplete();
    }
  };

  const minTime = slide.min_reading_time || 30;
  const remainingTime = Math.max(0, minTime - timeSpent);
  const canAdvance = remainingTime === 0;
  const progressPct = totalSlides > 0 ? ((slideIndex + 1) / totalSlides) * 100 : 0;

  const navButtons = (
    <>
      <button
        onClick={onPrevious}
        className="btn btn-secondary"
        disabled={!hasPrevious}
      >
        הקודם
      </button>
      <button
        onClick={() => setShowQuestions(!showQuestions)}
        className="btn btn-secondary"
      >
        {showQuestions ? 'הסתר שאלות' : 'תרגול'}
      </button>
      <button
        onClick={handleComplete}
        className="btn btn-primary"
        disabled={!canAdvance}
      >
        {canGoNext ? 'הבא' : 'סיום'}
      </button>
    </>
  );

  return (
    <div>
      <div
        className="card"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.6rem)' }}>{slide.title}</h2>

        <div className="time-banner">
          <div className="time-banner-row">
            <div>
              <strong>זמן קריאה:</strong> {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
            </div>
            {remainingTime > 0 && (
              <div style={{ color: remainingTime <= 10 ? 'var(--error)' : 'var(--muted)' }}>
                נותרו {remainingTime} שניות לפני מעבר לשקף הבא
              </div>
            )}
          </div>
        </div>

        <div
          className="slide-content"
          dangerouslySetInnerHTML={{ __html: slide.content }}
        />

        {slide.media_url && (
          <div style={{ marginTop: '1.5rem' }}>
            {slide.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img src={slide.media_url} alt={slide.title} />
            ) : slide.media_url.match(/\.(mp4|webm)$/i) ? (
              <video src={slide.media_url} controls style={{ width: '100%', borderRadius: '8px' }} />
            ) : (
              <iframe src={slide.media_url} style={{ width: '100%', minHeight: '280px', border: 'none', borderRadius: '8px' }} />
            )}
          </div>
        )}

        <div className="desktop-nav-row">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasPrevious && (
              <button onClick={onPrevious} className="btn btn-secondary">הקודם</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowQuestions(!showQuestions)}
              className="btn btn-secondary"
            >
              {showQuestions ? 'הסתר' : 'שאלות תרגול'}
            </button>
            <span className="ask-inline">
              <AskQuestion slideId={slide.id} />
            </span>
            <button onClick={handleComplete} className="btn btn-primary" disabled={!canAdvance}>
              {canGoNext ? 'הבא' : 'סיום נושא'}
            </button>
          </div>
        </div>
      </div>

      {showQuestions && (
        <div style={{ marginTop: '1rem' }}>
          <PracticeQuestions slideId={slide.id} />
        </div>
      )}

      <AskQuestion slideId={slide.id} fab />

      <nav className="sticky-nav" aria-label="ניווט שקפים">
        <div className="sticky-meta">
          שקף {slideIndex + 1} מתוך {totalSlides}
          {moduleTitle ? ` · ${moduleTitle}` : ''}
        </div>
        <div className="progress-slim" style={{ marginBottom: '0.5rem' }}>
          <div style={{ width: `${progressPct}%` }} />
        </div>
        <div className="sticky-nav-row">
          {navButtons}
        </div>
      </nav>
    </div>
  );
}
