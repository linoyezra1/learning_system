import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const API_URL = getInternalApiUrl();

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בחיבור לשרת' }, { status: 500 });
  }
}



