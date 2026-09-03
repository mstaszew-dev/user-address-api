import type { ApiResponse } from './types';

export const TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'authUser';

export const AUTH_EXPIRED_EVENT = 'auth:expired';

function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

async function parseBody(response: Response): Promise<ApiResponse<unknown> | null> {
  try {
    return (await response.json()) as ApiResponse<unknown>;
  } catch {
    return null;
  }
}

export async function apiCall<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  const response = await fetch('/api' + url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (response.status === 204) {
    return { success: true, message: 'No content', data: undefined as T };
  }
  const data = await parseBody(response);
  if (!response.ok) {
    if (response.status === 401 && token) {
      clearSession();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new Error((data && data.message) || 'Request failed: ' + response.status);
  }
  return data as ApiResponse<T>;
}
