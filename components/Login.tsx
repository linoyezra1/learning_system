'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setError(data.error || 'שגיאה בהתחברות');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>מערכת לימוד מתוקשבת</h1>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>
        קורס עזרה ראשונה - חוברת 44
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            שם משתמש:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            סיסמה:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '1rem',
            }}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {loading ? 'מתחבר...' : 'התחברות'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--muted)', textAlign: 'center' }}>
        <p>מערכת לניהול לימוד מתוקשב</p>
        <p>כניסה באמצעות שם משתמש וסיסמה</p>
      </div>
    </div>
  );
}

