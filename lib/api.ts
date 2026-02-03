// API utility - centralizes API calls to backend

// Get API URL - works in both client and server
export function getApiUrl(): string {
  // If NEXT_PUBLIC_API_URL is set, use it
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // In production (Render), use relative URLs since Express serves both frontend and API
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL (same origin)
    return '';
  }
  
  // Server-side fallback (shouldn't happen with static export, but just in case)
  return 'http://localhost:3001';
}

// Get internal API URL for server-side Next.js API routes
// This is used when Next.js API routes need to call the Express backend
export function getInternalApiUrl(): string {
  // If INTERNAL_API_URL is set (for production), use it
  const internalApiUrl = process.env.INTERNAL_API_URL;
  if (internalApiUrl) {
    return internalApiUrl;
  }
  
  // In production on Render, Express serves both frontend and API on same port
  // So we use relative URL or localhost
  if (process.env.NODE_ENV === 'production') {
    // On Render, the Express server runs on the same port, so use localhost
    const port = process.env.PORT || '3001';
    return `http://localhost:${port}`;
  }
  
  // Development: Express runs on port 3001
  return 'http://localhost:3001';
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

