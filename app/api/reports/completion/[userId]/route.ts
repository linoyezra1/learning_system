import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'אין הרשאה - נדרש טוקן אימות' }, { status: 401 });
  }

  try {
    const API_URL = getInternalApiUrl();
    const response = await fetch(`${API_URL}/api/reports/completion/${params.userId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'שגיאה ביצירת דוח' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    // Return PDF as blob
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report_${params.userId}_${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'שגיאה בחיבור לשרת' }, { status: 500 });
  }
}



