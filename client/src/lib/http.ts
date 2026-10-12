import axios, { AxiosError } from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5050/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const TOKEN_KEY = 'amsic.token';
const stores = () => [window.localStorage, window.sessionStorage];
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (token: string, remember = true) => {
    try {
      stores().forEach((st) => st.removeItem(TOKEN_KEY));
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch { return; }
  },
  clear: () => { try { stores().forEach((st) => st.removeItem(TOKEN_KEY)); } catch { return; } },
};

export const SESSION_EXPIRED_EVENT = 'amsic:session-expired';

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const url = err.config?.url ?? '';
    if (err.response?.status === 401 && !url.startsWith('/auth/login') && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(err);
  },
);

export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string>;
}

export function parseApiError(err: unknown): ApiErrorBody {
  if (err instanceof AxiosError) {
    if (err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      return err.response.data as ApiErrorBody;
    }
    if (err.code === 'ECONNABORTED') return { message: 'The server took too long to answer. Try again.' };
    if (!err.response) return { message: 'Cannot reach the server. Check that the API is running.' };
    return { message: `Request failed (${err.response.status})` };
  }
  return { message: err instanceof Error ? err.message : 'Something went wrong' };
}
