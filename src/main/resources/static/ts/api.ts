export interface AuthData {
    token: string;
    userId: string;
    email: string;
    name: string;
}

export interface UserDto {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
}

export interface AddressDto {
    id?: string;
    userId: string;
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
    type?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export const TOKEN_KEY = 'token';
export const USER_NAME_KEY = 'userName';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

export function setAuth(token: string, name: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_NAME_KEY, name || '');
}

export function clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_NAME_KEY);
}

export async function apiCall<T>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    const options: RequestInit = { method, headers };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    let data: ApiResponse<T>;
    try {
        data = await response.json();
    } catch {
        data = { success: false, message: 'Unexpected response', data: undefined as T };
    }
    if (!response.ok) {
        throw new Error((data && data.message) || 'Request failed: ' + response.status);
    }
    return data;
}
