'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SlideViewer from './SlideViewer';

export default function CourseViewer({ course }: { course: any }) {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (course.modules && course.modules.length > 0) {
      setSelectedModule(course.modules[0]);
      loadSlides(course.modules[0].id);
    } else {
      setLoading(false);
    }
  }, [course]);

  const loadSlides = async (moduleId: number) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/slides/module/${moduleId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setSlides(data);
    setCurrentSlideIndex(0);
    setLoading(false);
  };

  const handleModuleChange = (module: any) => {
    setSelectedModule(module);
    loadSlides(module.id);
  };

  const handleSlideComplete = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      // Check if there are more modules
      const currentModuleIndex = course.modules.findIndex((m: any) => m.id === selectedModule.id);
      if (currentModuleIndex < course.modules.length - 1) {
        const nextModule = course.modules[currentModuleIndex + 1];
        handleModuleChange(nextModule);
      } else {
        alert('סיימת את כל הקורס! כל הכבוד!');
        router.push('/dashboard');
      }
    }
  };

  if (loading) {
    return <div className="loading">טוען שקפים...</div>;
  }

  if (slides.length === 0) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="card">
          <h2>אין שקפים בנושא זה</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{course.title}</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            חזור ללוח בקרה
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        {/* Module Selector */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>בחר נושא:</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {course.modules.map((module: any) => (
              <button
                key={module.id}
                onClick={() => handleModuleChange(module)}
                className={`btn ${selectedModule?.id === module.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.9rem' }}
              >
                {module.title}
              </button>
            ))}
          </div>
        </div>

        {/* Slide Progress */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>שקף {currentSlideIndex + 1} מתוך {slides.length}</span>
            <span>{selectedModule?.title}</span>
          </div>
          <div style={{ marginTop: '0.5rem', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${((currentSlideIndex + 1) / slides.length) * 100}%`,
                background: 'var(--brand-deep)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Current Slide */}
        {slides[currentSlideIndex] && (
          <SlideViewer
            slide={slides[currentSlideIndex]}
            onComplete={handleSlideComplete}
            canGoNext={currentSlideIndex < slides.length - 1}
            onPrevious={() => currentSlideIndex > 0 && setCurrentSlideIndex(currentSlideIndex - 1)}
            hasPrevious={currentSlideIndex > 0}
          />
        )}
      </div>
    </div>
  );
}

