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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setSlides(Array.isArray(data) ? data : []);
    setCurrentSlideIndex(0);
    setLoading(false);
  };

  const handleModuleChange = (module: any) => {
    setSelectedModule(module);
    setDrawerOpen(false);
    loadSlides(module.id);
  };

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const goPrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleSlideComplete = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
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
      <div className="app-shell">
        <div className="container" style={{ padding: '2rem 0' }}>
          <div className="card">
            <h2>אין שקפים בנושא זה</h2>
          </div>
        </div>
      </div>
    );
  }

  const syllabus = (
    <>
      <h3 style={{ marginBottom: '0.75rem' }}>נושאי הקורס</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {course.modules.map((module: any, index: number) => {
          const active = selectedModule?.id === module.id;
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => handleModuleChange(module)}
              className={`syllabus-row ${active ? 'active' : ''}`}
            >
              <span>{module.title}</span>
              <span className="syllabus-status">
                {active ? 'בתהליך' : index === 0 ? 'זמין' : 'נושא'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="נושאי הקורס"
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>מערכת הלמידה</div>
              <h1>{course.title}</h1>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
              חזרה
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <aside className={`syllabus-panel syllabus-mobile-only ${drawerOpen ? 'open' : ''}`}>
        {syllabus}
      </aside>

      <div className="container" style={{ padding: '1rem 0' }}>
        <div className="course-layout">
          <aside className="syllabus-panel syllabus-desktop">
            {syllabus}
          </aside>

          <div className="slide-stage">
            {slides[currentSlideIndex] && (
              <SlideViewer
                slide={slides[currentSlideIndex]}
                slideIndex={currentSlideIndex}
                totalSlides={slides.length}
                moduleTitle={selectedModule?.title}
                onComplete={handleSlideComplete}
                canGoNext={currentSlideIndex < slides.length - 1}
                onPrevious={goPrevious}
                hasPrevious={currentSlideIndex > 0}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
