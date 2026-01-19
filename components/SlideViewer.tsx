'use client';

import { useEffect, useState, useRef } from 'react';
import PracticeQuestions from './PracticeQuestions';
import AskQuestion from './AskQuestion';

export default function SlideViewer({
  slide,
  onComplete,
  canGoNext,
  onPrevious,
  hasPrevious
}: {
  slide: any;
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

  useEffect(() => {
    // Load existing progress
    const token = localStorage.getItem('token');
    fetch(`/api/slides/${slide.id}/progress`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTimeSpent(data.timeSpent || 0);
        setIsCompleted(data.completed || false);
      });

    // Start timer
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Save progress on unmount
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

    // Save as completed
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

  const minTime = slide.min_reading_time || 30;
  const remainingTime = Math.max(0, minTime - timeSpent);

  return (
    <div>
      <div className="card">
        <h2>{slide.title}</h2>
        
        {/* Time tracking */}
        <div style={{ margin: '1rem 0', padding: '1rem', background: 'var(--brand-cream)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

        {/* Slide Content */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: 'white',
            borderRadius: '8px',
            lineHeight: '1.8',
            fontSize: '1.1rem'
          }}
          dangerouslySetInnerHTML={{ __html: slide.content }}
        />

        {/* Media */}
        {slide.media_url && (
          <div style={{ marginTop: '1.5rem' }}>
            {slide.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img src={slide.media_url} alt={slide.title} style={{ maxWidth: '100%', borderRadius: '8px' }} />
            ) : slide.media_url.match(/\.(mp4|webm)$/i) ? (
              <video src={slide.media_url} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
            ) : (
              <iframe src={slide.media_url} style={{ width: '100%', minHeight: '400px', border: 'none', borderRadius: '8px' }} />
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <div>
            {hasPrevious && (
              <button onClick={onPrevious} className="btn btn-secondary">
                ← שקף קודם
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowQuestions(!showQuestions)}
              className="btn btn-secondary"
            >
              {showQuestions ? 'הסתר' : 'שאלות תרגול'}
            </button>
            <AskQuestion slideId={slide.id} />
            {canGoNext && remainingTime === 0 && (
              <button onClick={handleComplete} className="btn btn-primary">
                שקף הבא →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Practice Questions */}
      {showQuestions && (
        <div style={{ marginTop: '1rem' }}>
          <PracticeQuestions slideId={slide.id} />
        </div>
      )}
    </div>
  );
}

