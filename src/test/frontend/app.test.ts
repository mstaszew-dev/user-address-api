import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setAuth, isAuthenticated } from '../../main/resources/static/ts/api';
import '../../main/resources/static/ts/app';

function mockFetchOnce(status: number, payload: unknown): void {
    const json = async () => payload;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json }));
}

function setToken(token: string): void {
    setAuth(token, 'Alice');
}

let locHref = 'http://localhost/users';
const fakeLocation = {
    get href() {
        return locHref;
    },
    set href(v: string) {
        locHref = v;
    },
    get pathname() {
        try {
            return new URL(locHref).pathname;
        } catch {
            return locHref;
        }
    }
};

function stubWindowLocation(): void {
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: fakeLocation
    });
}

async function flush(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
}

const DOMHTML = `
    <div id="error-box" class="hidden"></div>
    <div id="form-error" class="hidden"></div>
    <div id="total-users"></div>
    <div id="total-addresses"></div>
    <div id="users-table-body"></div>
    <div id="nav-user-name"></div>
    <div id="user-modal" class="hidden">
        <input id="new-user-name" />
        <input id="new-user-email" />
        <input id="new-user-password" />
    </div>
`;

describe('app (DOM handlers)', () => {
    beforeEach(() => {
        document.body.innerHTML = DOMHTML;
        stubWindowLocation();
    });

    afterEach(() => {
        locHref = 'http://localhost/users';
        localStorage.clear();
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    it('loadUsers renders rows from API response', async () => {
        setToken('t');
        mockFetchOnce(200, {
            success: true,
            message: 'ok',
            data: [{ id: 'u1', name: 'A', email: 'a@b.com', role: 'USER', createdAt: '2024-01-01' }]
        });
        await window.loadUsers();
        const tbody = document.getElementById('users-table-body') as HTMLElement;
        expect(tbody.innerHTML).toContain('a@b.com');
    });

    it('loadUsers shows error on failure', async () => {
        setToken('t');
        mockFetchOnce(500, { success: false, message: 'boom', data: null });
        await window.loadUsers();
        const box = document.getElementById('error-box') as HTMLElement;
        expect(box.textContent).toContain('boom');
        expect(box.classList.contains('hidden')).toBe(false);
    });

    it('createUser succeeds and hides modal', async () => {
        setToken('t');
        mockFetchOnce(200, { success: true, message: 'created', data: {} });
        (document.getElementById('new-user-name') as HTMLInputElement).value = 'Alice';
        (document.getElementById('new-user-email') as HTMLInputElement).value = 'a@b.com';
        (document.getElementById('new-user-password') as HTMLInputElement).value = 'password1';
        await window.createUser();
        const modal = document.getElementById('user-modal') as HTMLElement;
        expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('createUser validates before submitting', async () => {
        setToken('t');
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        (document.getElementById('new-user-name') as HTMLInputElement).value = '';
        (document.getElementById('new-user-email') as HTMLInputElement).value = 'a@b.com';
        (document.getElementById('new-user-password') as HTMLInputElement).value = 'password1';
        await window.createUser();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('createUser shows form error when API fails', async () => {
        setToken('t');
        mockFetchOnce(409, { success: false, message: 'Email already registered', data: null });
        (document.getElementById('new-user-name') as HTMLInputElement).value = 'Alice';
        (document.getElementById('new-user-email') as HTMLInputElement).value = 'a@b.com';
        (document.getElementById('new-user-password') as HTMLInputElement).value = 'password1';
        await window.createUser();
        const box = document.getElementById('form-error') as HTMLElement;
        expect(box.textContent).toContain('Email already registered');
        expect(box.classList.contains('hidden')).toBe(false);
    });

    it('deleteUser confirms then calls delete API', async () => {
        setToken('t');
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockFetchOnce(200, { success: true, message: 'deleted', data: null });
        mockFetchOnce(200, { success: true, message: 'ok', data: [] });
        await window.deleteUser('u1');
        const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.some((c) => c[0] === '/api/users/u1')).toBe(true);
    });

    it('deleteUser shows error when API fails', async () => {
        setToken('t');
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mockFetchOnce(500, { success: false, message: 'delete failed', data: null });
        await window.deleteUser('u1');
        const box = document.getElementById('error-box') as HTMLElement;
        expect(box.textContent).toContain('delete failed');
        expect(box.classList.contains('hidden')).toBe(false);
    });

    it('deleteUser aborts when not confirmed', async () => {
        setToken('t');
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        await window.deleteUser('u1');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('guardPage returns false and navigates to login when unauthenticated', () => {
        expect(isAuthenticated()).toBe(false);
        expect(() => window.loadUsers()).not.toThrow();
        expect(locHref).toBe('/login');
    });

    it('logout clears auth and navigates to login', () => {
        setToken('t');
        window.logout();
        expect(isAuthenticated()).toBe(false);
        expect(locHref).toBe('/login');
    });

    it('doLogin succeeds and navigates to dashboard', async () => {
        mockFetchOnce(200, {
            success: true,
            message: 'ok',
            data: { token: 't2', name: 'Alice' }
        });
        document.body.innerHTML =
            '<input id="email" value="a@b.com" /><input id="password" value="pw12345" /><div id="error-box" class="hidden"></div>';
        await window.doLogin();
        expect(isAuthenticated()).toBe(true);
        expect(locHref).toBe('/dashboard');
    });

    it('doLogin shows validation error for missing fields', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        document.body.innerHTML =
            '<input id="email" value="" /><input id="password" value="" /><div id="error-box" class="hidden"></div>';
        await window.doLogin();
        const box = document.getElementById('error-box') as HTMLElement;
        expect(box.textContent).toContain('required');
        expect(box.classList.contains('hidden')).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('doLogin shows error message on API failure', async () => {
        mockFetchOnce(401, { success: false, message: 'Bad credentials', data: null });
        document.body.innerHTML =
            '<input id="email" value="a@b.com" /><input id="password" value="pw12345" /><div id="error-box" class="hidden"></div>';
        await window.doLogin();
        const box = document.getElementById('error-box') as HTMLElement;
        expect(box.textContent).toContain('Bad credentials');
        expect(isAuthenticated()).toBe(false);
    });

    it('loadDashboard totals users and addresses', async () => {
        setToken('t');
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [{ id: 'u1' }, { id: 'u2' }] })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [{ id: 'a1' }] })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [] })
            });
        vi.stubGlobal('fetch', fetchMock);
        locHref = 'http://localhost/dashboard';
        await window.loadDashboard();
        expect((document.getElementById('total-users') as HTMLElement).textContent).toBe('2');
        expect((document.getElementById('total-addresses') as HTMLElement).textContent).toBe('1');
    });

    it('loadDashboard shows error on API failure', async () => {
        setToken('t');
        mockFetchOnce(500, { success: false, message: 'dashboard failed', data: null });
        locHref = 'http://localhost/dashboard';
        await window.loadDashboard();
        const box = document.getElementById('error-box') as HTMLElement;
        expect(box.textContent).toContain('dashboard failed');
    });

    it('showUserForm and hideUserForm toggle the modal', () => {
        setToken('t');
        window.showUserForm();
        expect((document.getElementById('user-modal') as HTMLElement).classList.contains('hidden')).toBe(
            false
        );
        window.hideUserForm();
        expect((document.getElementById('user-modal') as HTMLElement).classList.contains('hidden')).toBe(
            true
        );
    });

    describe('DOMContentLoaded bootstrap', () => {
        it('redirects to dashboard from login when already authenticated', async () => {
            setToken('t');
            locHref = 'http://localhost/login';
            mockFetchOnce(200, { success: true, message: 'ok', data: [] });
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            expect(locHref).toBe('/dashboard');
            vi.restoreAllMocks();
        });

        it('wires password keydown to login on /login page', async () => {
            localStorage.clear();
            locHref = 'http://localhost/login';
            const body = DOMHTML;
            body.replace('id="new-user-password"', 'id="password"');
            document.body.innerHTML =
                body + '<input id="email" value="a@b.com" /><input id="password" value="pw12345" />';
            mockFetchOnce(200, { success: true, message: 'ok', data: { token: 't', name: 'A' } });
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            const pw = document.getElementById('password') as HTMLInputElement;
            pw.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            await flush();
            expect(isAuthenticated()).toBe(true);
            vi.restoreAllMocks();
        });

        it('loads users on /users page', async () => {
            setToken('t');
            locHref = 'http://localhost/users';
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [] })
            });
            vi.stubGlobal('fetch', fetchMock);
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            const urls = fetchMock.mock.calls.map((c) => c[0]);
            expect(urls).toContain('/api/users');
            vi.restoreAllMocks();
        });

        it('delegates delete clicks on user rows to deleteUser', async () => {
            setToken('t');
            locHref = 'http://localhost/users';
            vi.spyOn(window, 'confirm').mockReturnValue(true);
            const fetchMock = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true, message: 'deleted', data: null })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true, message: 'ok', data: [] })
                });
            vi.stubGlobal('fetch', fetchMock);
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            const tbody = document.getElementById('users-table-body') as HTMLElement;
            const btn = document.createElement('button');
            btn.setAttribute('data-delete-user', 'u1');
            tbody.appendChild(btn);
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await flush();
            const urls = fetchMock.mock.calls.map((c) => c[0]);
            expect(urls).toContain('/api/users/u1');
            vi.restoreAllMocks();
        });

        it('delegation ignores clicks not on a delete button', async () => {
            setToken('t');
            locHref = 'http://localhost/users';
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [] })
            });
            vi.stubGlobal('fetch', fetchMock);
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            const tbody = document.getElementById('users-table-body') as HTMLElement;
            tbody.appendChild(document.createElement('td'));
            const btnNoData = document.createElement('button');
            tbody.appendChild(btnNoData);
            tbody.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            btnNoData.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await flush();
            const urls = fetchMock.mock.calls.map((c) => c[0]);
            expect(urls.filter((u) => u.startsWith('/api/users/')).length).toBe(0);
            vi.restoreAllMocks();
        });

        it('delegation is safe when the users table is absent', async () => {
            setToken('t');
            locHref = 'http://localhost/users';
            document.body.innerHTML = '';
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [] })
            });
            vi.stubGlobal('fetch', fetchMock);
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            expect(document.getElementById('users-table-body')).toBeNull();
            vi.restoreAllMocks();
        });

        it('loads dashboard on /dashboard page', async () => {
            setToken('t');
            locHref = 'http://localhost/dashboard';
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, message: 'ok', data: [] })
            });
            vi.stubGlobal('fetch', fetchMock);
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            const urls = fetchMock.mock.calls.map((c) => c[0]);
            expect(urls).toContain('/api/users');
            vi.restoreAllMocks();
        });

        it('guards the /about page', async () => {
            setToken('t');
            locHref = 'http://localhost/about';
            document.dispatchEvent(new Event('DOMContentLoaded'));
            await flush();
            expect(isAuthenticated()).toBe(true);
            vi.restoreAllMocks();
        });
    });
});
