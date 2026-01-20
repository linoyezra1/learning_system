import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '@/lib/api';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'אין הרשאה - נדרש טוקן אימות' }, { status: 401 });
  }

  try {
    const API_URL = getInternalApiUrl();
    const response = await fetch(`${API_URL}/api/users/sync-from-excel`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error syncing from Excel:', error);
    return NextResponse.json({ error: 'שגיאה בסנכרון מהקובץ' }, { status: 500 });
  }
}



