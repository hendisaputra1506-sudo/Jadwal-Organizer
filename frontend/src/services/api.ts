const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  conflictWarning?: any;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    message: 'Respon dari server tidak valid.',
  }));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if unauthorized
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error(json.message || `Terjadi kesalahan (Kode: ${response.status})`);
  }

  return json as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload: async <T>(endpoint: string, formData: FormData): Promise<T> => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      message: 'Respon dari server tidak valid.',
    }));

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new Error(json.message || `Terjadi kesalahan (Kode: ${response.status})`);
    }

    return json as T;
  },
};
