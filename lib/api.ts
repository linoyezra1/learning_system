// API utility - centralizes API calls to backend

// Get API URL - works in both client and server
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use environment variable or default
    return (window as any).__API_URL__ || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  // Server-side
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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

