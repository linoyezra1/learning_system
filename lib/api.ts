// API utility - centralizes API calls to backend

// Get API URL - works in both client and server
export function getApiUrl(): string {
  // If NEXT_PUBLIC_API_URL is set, use it (works for both local and production)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // Client-side: check if we're in production (Render) where Express serves both frontend and API
  if (typeof window !== 'undefined') {
    // In production on Render, Express serves both frontend and API on same port, so relative URL works
    // In local dev, Next.js (3000) and Express (3001) are separate, so we need absolute URL
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // Production: use relative URL (same origin - Express serves both)
      return '';
    } else {
      // Local dev: Next.js on 3000, Express on 3001 - need absolute URL
      return 'http://localhost:3001';
    }
  }
  
  // Server-side (Next.js API routes): prefer an explicitly configured backend URL
  const serverApiUrl = process.env.API_URL;
  if (serverApiUrl) return serverApiUrl;

  // Server-side fallback: use PORT if set (Render), otherwise 3001 (local Express)
  // This runs at runtime, so PORT will be available in Render
  const port = process.env.PORT || '3001';
  return `http://127.0.0.1:${port}`;
}

// For Next.js Route Handlers (server-only) where we need an absolute URL to reach the backend API.
// IMPORTANT: This must be called inside route handlers, not at module level, to ensure PORT is available at runtime
export function getInternalApiUrl(): string {
  return getApiUrl();
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${getApiUrl()}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

