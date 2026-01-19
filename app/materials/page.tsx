'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Check if handbook exists - try multiple possible locations
    setMaterials([
      {
        id: 1,
        title: 'חוברת 44 מעודכן 04.01.pdf',
        description: 'חוברת הקורס המלאה - קורס עזרה ראשונה',
        type: 'pdf',
        url: '/חוברת 44 מעודכן 04.01.pdf', // Try root public folder first
        altUrls: [
          '/uploads/חוברת 44 מעודכן 04.01.pdf',
          '/handbook.pdf',
          '/uploads/handbook.pdf'
        ]
      }
    ]);
    setLoading(false);
  }, [router]);

  const handleDownload = async (material: any) => {
    try {
      // Try to download via API route first
      const response = await fetch('/api/materials/download');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = material.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'שגיאה בהורדת הקובץ');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('שגיאה בהורדת הקובץ. ודא שהקובץ "חוברת 44 מעודכן 04.01.pdf" נמצא בתיקיית הפרויקט.');
    }
  };

  const handlePrint = async (material: any) => {
    try {
      // Download and open in new window for printing
      const response = await fetch('/api/materials/download');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'שגיאה בפתיחת הקובץ להדפסה');
      }
    } catch (error) {
      console.error('Print error:', error);
      alert('שגיאה בפתיחת הקובץ להדפסה');
    }
  };

  if (loading) {
    return <div className="loading">טוען חומרים...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ background: 'white', boxShadow: 'var(--shadow-soft)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>חומרי לימוד להורדה והדפסה</h1>
          <button onClick={() => router.push('/dashboard')} className="btn btn-secondary">
            חזור ללוח בקרה
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="card">
          <h2>חומרי הקורס</h2>
          <p style={{ margin: '1rem 0', color: 'var(--muted)' }}>
            כאן תוכל להוריד ולהדפיס את חומרי הלימוד של הקורס
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            {materials.length > 0 ? (
              materials.map((material) => (
                <div
                  key={material.id}
                  style={{
                    padding: '1.5rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3>{material.title}</h3>
                    {material.description && (
                      <p style={{ margin: '0.5rem 0 0 0', color: 'var(--muted)' }}>{material.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDownload(material)}
                      className="btn btn-primary"
                    >
                      הורד
                    </button>
                    <button
                      onClick={() => handlePrint(material)}
                      className="btn btn-secondary"
                    >
                      הדפס
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>אין חומרים זמינים כרגע</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2>הערות</h2>
          <ul style={{ marginTop: '1rem', paddingRight: '1.5rem' }}>
            <li>ניתן להוריד את החומרים למחשב שלך</li>
            <li>ניתן להדפיס את החומרים ישירות מהדפדפן</li>
            <li>החומרים זמינים לך בכל עת במהלך הקורס</li>
            <li>מומלץ לשמור את החומרים למקרה שתרצה לחזור עליהם</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

