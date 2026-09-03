import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import UserListPage from './UserListPage';

const alice = {
  id: 'u1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@test.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00Z'
};
const admin = {
  id: 'u2',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  role: 'ADMIN',
  createdAt: '2026-01-01T00:00:00Z'
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  };
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/users']}>
      <AuthProvider>
        <Routes>
          <Route path="/users" element={<UserListPage />} />
          <Route path="/users/:id" element={<div>detail page</div>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('UserListPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem(
      'authUser',
      JSON.stringify({
        token: 'tok',
        userId: 'u2',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User'
      })
    );
    fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/users' && (!opts || opts.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({ success: true, message: 'ok', data: [alice, admin] })
        );
      }
      if (url === '/api/auth/register' && opts?.method === 'POST') {
        return Promise.resolve(jsonResponse({ success: true, message: 'created', data: {} }, 201));
      }
      if (/\/api\/users\/u1$/.test(url) && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 204 });
      }
      return Promise.resolve(
        jsonResponse({ success: false, message: 'unexpected', data: null }, 500)
      );
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders users in the table with name, email, and role', async () => {
    renderList();

    expect(await screen.findByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Smith')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('USER').length).toBeGreaterThan(0);
  });

  it('navigates to detail page via Manage action', async () => {
    const user = userEvent.setup();
    renderList();

    await screen.findByText('alice@test.com');
    const rows = await screen.findAllByRole('row');
    const aliceRow = rows.find((r) => within(r).queryByText('alice@test.com') !== null)!;
    await user.click(within(aliceRow).getByRole('link', { name: /manage/i }));

    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('adds a user through the Add User dialog', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole('button', { name: /add user/i }));
    await user.type(await screen.findByLabelText(/first name/i), 'Bob');
    await user.type(screen.getByLabelText(/last name/i), 'Jones');
    await user.type(screen.getByLabelText(/email/i), 'bob@test.com');
    await user.type(screen.getByLabelText(/password/i), 'secret1');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, opts]) => url === '/api/auth/register' && opts?.method === 'POST'
      );
      expect(call).toBeTruthy();
    });
    const [, opts] = fetchMock.mock.calls.find(
      ([url, opts]) => url === '/api/auth/register' && opts?.method === 'POST'
    ) as [string, RequestInit];
    expect(JSON.parse(opts.body as string)).toMatchObject({
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@test.com',
      password: 'secret1'
    });
  });

  it('deletes a user via confirm dialog and refetches the list', async () => {
    const user = userEvent.setup();
    renderList();

    await screen.findByText('alice@test.com');
    const rows = await screen.findAllByRole('row');
    const aliceRow = rows.find((r) => within(r).queryByText('alice@test.com') !== null)!;
    await user.click(within(aliceRow).getByRole('button', { name: /delete/i }));

    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/users/u1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
    const refetch = fetchMock.mock.calls.filter(([url]) => url === '/api/users');
    expect(refetch.length).toBeGreaterThanOrEqual(2);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancelling the delete dialog keeps the user', async () => {
    const user = userEvent.setup();
    renderList();

    await screen.findByText('alice@test.com');
    const rows = await screen.findAllByRole('row');
    const aliceRow = rows.find((r) => within(r).queryByText('alice@test.com') !== null)!;
    await user.click(within(aliceRow).getByRole('button', { name: /delete/i }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/users/u1',
      expect.objectContaining({ method: 'DELETE' })
    );

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
