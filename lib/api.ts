// API utility - centralizes API calls to backend

// Get API URL - works in both client and server
export function getApiUrl(): string {
  // If NEXT_PUBLIC_API_URL is set (from Railway variables), use it
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    return apiUrl;
  }
  
  // In production, when Express serves both frontend and API, use relative URLs
  if (typeof window !== 'undefined') {
    // Client-side: empty string makes the request go to the same domain as the site
    return '';
  }
  
  // Server-side fallback for development
  return 'http://localhost:3001';
}

// Get internal API URL for server-side Next.js API routes
export function getInternalApiUrl(): string {
  const internalApiUrl = process.env.INTERNAL_API_URL;
  if (internalApiUrl) {
    return internalApiUrl;
  }
  
  // In production, use the environment port or 3001
  const port = process.env.PORT || '3001';
  
  if (process.env.NODE_ENV === 'production') {
    // 127.0.0.1 is more stable than 'localhost' inside server environments
    return `http://127.0.0.1:${port}`;
  }
  
  // Development default
  return `http://localhost:${port}`;
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

  // Build the full URL
  const baseUrl = getApiUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}
