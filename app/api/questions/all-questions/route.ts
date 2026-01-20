import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '@/lib/api';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  if (!authHeader) {
    return NextResponse.json({ error: 'אין הרשאה - נדרש טוקן אימות' }, { status: 401 });
  }

  try {
    const API_URL = getInternalApiUrl();
    let url = `${API_URL}/api/questions/all-questions`;
    if (status) {
      url += `?status=${status}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching all questions:', error);
    return NextResponse.json({ error: 'שגיאה בחיבור לשרת' }, { status: 500 });
  }
}



