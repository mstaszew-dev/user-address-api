import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    apiCall,
    getToken,
    setAuth,
    clearAuth,
    isAuthenticated,
    TOKEN_KEY,
    USER_NAME_KEY
} from '../../main/resources/static/ts/api';

describe('api', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });
    describe('auth helpers', () => {
        it('returns null token when not set', () => {
            expect(getToken()).toBeNull();
            expect(isAuthenticated()).toBe(false);
        });

        it('setAuth and isAuthenticated reflect stored token', () => {
            setAuth('abc123', 'Alice');
            expect(getToken()).toBe('abc123');
            expect(localStorage.getItem(TOKEN_KEY)).toBe('abc123');
            expect(localStorage.getItem(USER_NAME_KEY)).toBe('Alice');
            expect(isAuthenticated()).toBe(true);
        });

        it('clearAuth removes stored values', () => {
            setAuth('abc123', 'Alice');
            clearAuth();
            expect(getToken()).toBeNull();
            expect(isAuthenticated()).toBe(false);
        });
    });

    describe('apiCall', () => {
        it('adds Authorization header when token present', async () => {
            setAuth('tok-1', 'Alice');
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [] })
            });
            vi.stubGlobal('fetch', fetchMock);

            await apiCall('GET', '/api/users');

            const [url, options] = fetchMock.mock.calls[0];
            expect(url).toBe('/api/users');
            expect(options.headers).toMatchObject({
                'Content-Type': 'application/json',
                Authorization: 'Bearer tok-1'
            });
        });

        it('throws on non-ok response with server message', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 409,
                json: async () => ({ success: false, message: 'Email already registered', data: null })
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(apiCall('POST', '/api/auth/register', {})).rejects.toThrow(
                'Email already registered'
            );
        });

        it('throws with status code when no message', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => null
            });
            vi.stubGlobal('fetch', fetchMock);

            await expect(apiCall('GET', '/api/users')).rejects.toThrow('Request failed: 500');
        });

        it('serializes body as JSON', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: null })
            });
            vi.stubGlobal('fetch', fetchMock);

            const body = { name: 'Alice', email: 'a@b.com' };
            await apiCall('POST', '/api/auth/register', body);

            const [, options] = fetchMock.mock.calls[0];
            expect(JSON.parse(options.body)).toEqual(body);
        });

        it('does not send body when undefined', async () => {
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: null })
            });
            vi.stubGlobal('fetch', fetchMock);

            await apiCall('GET', '/api/users');

            const [, options] = fetchMock.mock.calls[0];
            expect(options.body).toBeUndefined();
        });
    });
});
