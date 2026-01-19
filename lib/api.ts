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

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
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

