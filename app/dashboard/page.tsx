'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentDashboard from '@/components/StudentDashboard';
import InstructorDashboard from '@/components/InstructorDashboard';
import { getApiUrl } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          localStorage.removeItem('token');
          router.push('/');
        } else {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/');
      });
  }, [router]);

  if (loading) {
    return <div className="loading">טוען...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      {user.role === 'student' ? (
        <StudentDashboard user={user} />
      ) : (
        <InstructorDashboard user={user} />
      )}
    </div>
  );
}

