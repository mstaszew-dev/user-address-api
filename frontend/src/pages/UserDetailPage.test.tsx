import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import UserDetailPage from './UserDetailPage';

const user = {
  id: 'u1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@test.com',
  role: 'USER',
  createdAt: '2026-01-01T00:00:00Z'
};
const homeAddress = { id: 'a1', userId: 'u1', street: '1 Main St', city: 'Tel Aviv', zipCode: '61000', country: 'IL', type: 'HOME' };
const workAddress = { id: 'a2', userId: 'u1', street: '9 Work Ave', city: 'Haifa', zipCode: '30000', country: 'IL', type: 'WORK' };

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/users/u1']}>
      <AuthProvider>
        <Routes>
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/users" element={<div>list page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('UserDetailPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  let store: { profile: typeof user; addresses: Array<typeof homeAddress> };

  beforeEach(() => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem(
      'authUser',
      JSON.stringify({ token: 'tok', userId: 'admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'User' })
    );
    store = { profile: { ...user }, addresses: [{ ...homeAddress }, { ...workAddress }] };
    fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      const body = opts?.body ? JSON.parse(opts.body as string) : {};
      if (url === '/api/users/u1' && method === 'GET') {
        return Promise.resolve(jsonResponse({ success: true, message: 'ok', data: store.profile }));
      }
      if (url === '/api/addresses/user/u1' && method === 'GET') {
        return Promise.resolve(jsonResponse({ success: true, message: 'ok', data: store.addresses }));
      }
      if (url === '/api/users/u1' && method === 'PUT') {
        store.profile = { ...store.profile, ...body };
        return Promise.resolve(jsonResponse({ success: true, message: 'updated', data: store.profile }));
      }
      if (url === '/api/addresses' && method === 'POST') {
        const created = { ...body, id: 'a3' };
        store.addresses = [...store.addresses, created];
        return Promise.resolve(jsonResponse({ success: true, message: 'created', data: created }, 201));
      }
      if (url === '/api/addresses/a1' && method === 'PUT') {
        store.addresses = store.addresses.map((a) => (a.id === 'a1' ? { ...a, ...body } : a));
        return Promise.resolve(jsonResponse({ success: true, message: 'updated', data: store.addresses[0] }));
      }
      if (url === '/api/addresses/a1' && method === 'DELETE') {
        store.addresses = store.addresses.filter((a) => a.id !== 'a1');
        return Promise.resolve({ ok: true, status: 204 });
      }
      return Promise.resolve(jsonResponse({ success: false, message: 'unexpected', data: null }, 500));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows profile card and both addresses', async () => {
    renderDetail();

    expect(await screen.findByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('1 Main St')).toBeInTheDocument();
    expect(screen.getByText('9 Work Ave')).toBeInTheDocument();
    expect(screen.getByText('Tel Aviv')).toBeInTheDocument();
    expect(screen.getByText('Haifa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add address/i })).toBeInTheDocument();
  });

  it('edits the profile with only changed fields and re-renders', async () => {
    const actor = userEvent.setup();
    renderDetail();

    await screen.findByText('alice@test.com');
    await actor.click(screen.getByRole('button', { name: /edit profile/i }));
    const lastNameField = await screen.findByLabelText(/last name/i);
    await actor.clear(lastNameField);
    await actor.type(lastNameField, 'NewName');
    await actor.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url, opts]) => url === '/api/users/u1' && opts?.method === 'PUT');
      expect(call).toBeTruthy();
    });
    const [, opts] = fetchMock.mock.calls.find(([url, opts]) => url === '/api/users/u1' && opts?.method === 'PUT') as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.lastName).toBe('NewName');
    expect(body.firstName).toBeUndefined();
    expect(await screen.findByText(/NewName/)).toBeInTheDocument();
  });

  it('adds an address via the dialog with the path userId', async () => {
    const actor = userEvent.setup();
    renderDetail();

    await screen.findByText('1 Main St');
    await actor.click(screen.getByRole('button', { name: /add address/i }));
    await actor.type(await screen.findByLabelText(/street/i), '5 New St');
    await actor.type(screen.getByLabelText(/^city/i), 'Netanya');
    await actor.type(screen.getByLabelText(/zip code/i), '40000');
    await actor.type(screen.getByLabelText(/country/i), 'IL');
    await actor.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url, opts]) => url === '/api/addresses' && opts?.method === 'POST');
      expect(call).toBeTruthy();
    });
    const [url, opts] = fetchMock.mock.calls.find(([u, o]) => u === '/api/addresses' && o?.method === 'POST') as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body).toMatchObject({ userId: 'u1', street: '5 New St', city: 'Netanya', zipCode: '40000', country: 'IL' });
    expect(url).toBe('/api/addresses');
    expect(await screen.findByText('5 New St')).toBeInTheDocument();
  });

  it('edits an existing address pre-filled in the dialog', async () => {
    const actor = userEvent.setup();
    renderDetail();

    await screen.findByText('1 Main St');
    const addressHeading = screen.getByText('1 Main St');
    const card = addressHeading.closest('.MuiCard-root') as HTMLElement;
    await actor.click(within(card).getByRole('button', { name: /edit/i }));

    const cityField = await screen.findByLabelText(/^city/i);
    await actor.clear(cityField);
    await actor.type(cityField, 'Herzliya');
    await actor.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url, opts]) => url === '/api/addresses/a1' && opts?.method === 'PUT');
      expect(call).toBeTruthy();
    });
    const [, opts] = fetchMock.mock.calls.find(([url, opts]) => url === '/api/addresses/a1' && opts?.method === 'PUT') as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.city).toBe('Herzliya');
    expect(await screen.findByText('Herzliya')).toBeInTheDocument();
  });

  it('deletes an address via confirm and refetches', async () => {
    const actor = userEvent.setup();
    renderDetail();

    await screen.findByText('1 Main St');
    const addressHeading = screen.getByText('1 Main St');
    const card = addressHeading.closest('.MuiCard-root') as HTMLElement;
    await actor.click(within(card).getByRole('button', { name: /delete/i }));
    await actor.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/addresses/a1', expect.objectContaining({ method: 'DELETE' }));
    });
    await waitFor(() => {
      const refetches = fetchMock.mock.calls.filter(([url]) => url === '/api/addresses/user/u1');
      expect(refetches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('navigates back to the list via back action', async () => {
    const actor = userEvent.setup();
    renderDetail();

    await screen.findByText('alice@test.com');
    await actor.click(screen.getByRole('button', { name: /all users/i }));
    expect(await screen.findByText('list page')).toBeInTheDocument();
  });
});
