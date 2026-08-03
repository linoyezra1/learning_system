import { NextRequest, NextResponse } from 'next/server';

import { getInternalApiUrl } from '@/lib/api';

/**
 * Proxy POST /api/webhooks/create-user → Express /api/webhooks/create-user
 * Alias path for CRM integrations that prefer /api/webhooks/*.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const API_URL = getInternalApiUrl();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = request.headers.get('x-api-key');
    const webhookSecret = request.headers.get('x-webhook-secret');
    const authorization = request.headers.get('authorization');

    if (apiKey) headers['X-API-Key'] = apiKey;
    if (webhookSecret) headers['X-Webhook-Secret'] = webhookSecret;
    if (authorization) headers['Authorization'] = authorization;

    const response = await fetch(`${API_URL}/api/webhooks/create-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying CRM webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach LMS webhook' },
      { status: 500 }
    );
  }
}
