const API_BASE = '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('serviya_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('serviya_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('serviya_token');
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/api') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data: any = null;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = { message: text || `Error HTTP ${response.status}: ${response.statusText}` };
    } catch (err) {
      data = { message: `Error HTTP ${response.status}: ${response.statusText}` };
    }
  }

  if (!response.ok) {
    let errorMsg = 'Error en la solicitud a la API.';
    if (data) {
      if (typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMsg = data.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (data.error) {
        errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data.message) {
        errorMsg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (typeof data === 'string') {
        errorMsg = data;
      }
    } else {
      errorMsg = `Error HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  return data as T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(endpoint, options);
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' })
};
