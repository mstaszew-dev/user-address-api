import type { ApiResponse } from './types';

export const TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'authUser';

export async function apiCall<T>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> {
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
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error((data && data.message) || 'Request failed: ' + response.status);
  }
  return data;
}
