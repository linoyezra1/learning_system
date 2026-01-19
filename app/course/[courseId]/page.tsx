'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CourseViewer from '@/components/CourseViewer';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetch(`/api/courses/${params.courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          router.push('/dashboard');
        } else {
          setCourse(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.courseId, router]);

  if (loading) {
    return <div className="loading">טוען קורס...</div>;
  }

  if (!course) {
    return <div className="error">קורס לא נמצא</div>;
  }

  return <CourseViewer course={course} />;
}



