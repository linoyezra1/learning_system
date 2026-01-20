import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '@/lib/api';

const API_URL = getInternalApiUrl();

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'אין הרשאה - נדרש טוקן אימות' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/api/progress/my-progress/detailed`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching detailed progress:', error);
    return NextResponse.json({ error: 'שגיאה בחיבור לשרת' }, { status: 500 });
  }
}

