import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiCall } from './client';

describe('apiCall', () => {
  beforeEach(() => {
    window.localStorage.setItem('token', 'tok');
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('attaches bearer token and parses json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, message: 'ok', data: [1, 2] })
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await apiCall<number[]>('GET', '/users');

    expect(res.data).toEqual([1, 2]);
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/users');
    expect(opts.method).toBe('GET');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('sends json body when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, message: 'ok', data: null })
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiCall('POST', '/auth/login', { email: 'a@b.c', password: 'pw' });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(opts.body).toBe(JSON.stringify({ email: 'a@b.c', password: 'pw' }));
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('throws backend message on error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ success: false, message: 'Email already in use', data: null })
      })
    );

    await expect(apiCall('POST', '/auth/register', {})).rejects.toThrow('Email already in use');
  });

  it('handles 204 no-content without parsing json', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    const res = await apiCall('DELETE', '/users/u1');

    expect(res.success).toBe(true);
  });
});
