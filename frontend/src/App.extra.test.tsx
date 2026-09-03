import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import RequireAuth from './components/RequireAuth';
import { AuthProvider, useAuth } from './context/AuthContext';
import UserListPage from './pages/UserListPage';
import UserDetailPage from './pages/UserDetailPage';
import { apiCall } from './api/client';

const session = {
  token: 'tok',
  userId: 'u1',
  email: 'a@b.c',
  firstName: 'A',
  lastName: 'B'
};

function seedSession() {
  localStorage.setItem('token', session.token);
  localStorage.setItem('authUser', JSON.stringify(session));
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('App root component', () => {
  it('renders the full app with browser router and redirects root to login', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('RequireAuth authenticated path', () => {
  it('renders children when a session exists', () => {
    seedSession();
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/secret"
              element={
                <RequireAuth>
                  <div>secret content</div>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});

describe('AuthContext edge cases', () => {
  it('treats corrupted stored user JSON as no session', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('authUser', '{not json');
    render(
      <MemoryRouter>
        <AuthProvider>
          <div>app</div>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('app')).toBeInTheDocument();
  });
});

describe('UserListPage error and logout paths', () => {
  it('shows a page error when loading users fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ success: false, message: 'Server exploded', data: null })
      })
    );
    seedSession();
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthProvider>
          <Routes>
            <Route path="/users" element={<UserListPage />} />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByTestId('page-error')).toHaveTextContent('Server exploded');
  });

  it('signs out, clears storage, and returns to login', async () => {
    const actor = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, message: 'ok', data: [] })
      })
    );
    seedSession();
    render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthProvider>
          <Routes>
            <Route path="/users" element={<UserListPage />} />
            <Route path="/login" element={<div>login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    await screen.findByText(/no users found/i);
    await actor.click(screen.getByRole('button', { name: /sign out/i }));
    expect(await screen.findByText('login page')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
  });
});

describe('UserDetailPage delete failure', () => {
  it('shows a page error when address deletion fails', async () => {
    const actor = userEvent.setup();
    seedSession();
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      if (url === '/api/users/u1' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'ok',
              data: {
                id: 'u1',
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'a@b.c',
                role: 'USER'
              }
            })
        });
      }
      if (url === '/api/addresses/user/u1' && method === 'GET') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'ok',
              data: [
                {
                  id: 'a1',
                  userId: 'u1',
                  street: '1 Main St',
                  city: 'X',
                  state: 'Y',
                  zipCode: '1',
                  country: 'IL'
                }
              ]
            })
        });
      }
      if (url === '/api/addresses/a1' && method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ success: false, message: 'Delete failed', data: null })
        });
      }
      return Promise.reject(new Error('unexpected ' + url));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/users/u1']}>
        <AuthProvider>
          <Routes>
            <Route path="/users/:id" element={<UserDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByText('1 Main St');
    const card = screen.getByTestId('address-card');
    await actor.click(within(card).getByRole('button', { name: /delete/i }));
    await actor.click(await screen.findByRole('button', { name: /confirm/i }));

    expect(await screen.findByTestId('page-error')).toHaveTextContent('Delete failed');
  });
});

describe('apiCall fallback error message', () => {
  it('falls back to status text when the body has no message', async () => {
    seedSession();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 418,
        json: () => Promise.resolve({ success: false, data: null })
      })
    );
    await expect(apiCall('GET', '/x')).rejects.toThrow('Request failed: 418');
  });
});

describe('apiCall 401 session expiry', () => {
  it('clears the session and dispatches the expiry event on 401', async () => {
    seedSession();
    const listener = vi.fn();
    window.addEventListener('auth:expired', listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, message: 'Unauthorized', data: null })
      })
    );

    await expect(apiCall('GET', '/users')).rejects.toThrow('Unauthorized');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:expired', listener);
  });

  it('does not dispatch the expiry event for a logged-out 401 (public login failure)', async () => {
    const listener = vi.fn();
    window.addEventListener('auth:expired', listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, message: 'Invalid', data: null })
      })
    );

    await expect(apiCall('POST', '/auth/login', {})).rejects.toThrow('Invalid');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('auth:expired', listener);
  });
});

describe('AuthContext.updateSession', () => {
  it('updates the stored session user', async () => {
    seedSession();
    let captured: ((c: Record<string, string>) => void) | null = null;
    function Probe() {
      const auth = useAuth();
      captured = auth.updateSession;
      return null;
    }
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    captured!({ firstName: 'Renamed' });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('authUser')!);
      expect(stored.firstName).toBe('Renamed');
    });
  });
});
