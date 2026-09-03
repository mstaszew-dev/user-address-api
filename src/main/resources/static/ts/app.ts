import { apiCall, clearAuth, isAuthenticated, setAuth } from './api';
import { buildUserRow, escapeHtml, validateLogin, validateNewUser } from './helpers';

const API_BASE = '/api';

function showError(message: string): void {
    const box = document.getElementById('error-box');
    if (box) {
        box.textContent = message;
        box.classList.remove('hidden');
    }
}

function clearError(): void {
    const box = document.getElementById('error-box');
    if (box) {
        box.classList.add('hidden');
    }
}

function showFormError(message: string): void {
    const box = document.getElementById('form-error');
    if (box) {
        box.textContent = message;
        box.classList.remove('hidden');
    }
}

function setNavUserName(): void {
    const el = document.getElementById('nav-user-name');
    if (el) {
        el.textContent = localStorage.getItem('userName') || '';
        el.style.display = '';
    }
}

function guardPage(): boolean {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    setNavUserName();
    return true;
}

async function doLogin(): Promise<void> {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const validationError = validateLogin(email, password);
    if (validationError) {
        showError(validationError);
        return;
    }
    try {
        const data = await apiCall<{ token: string; name: string }>('POST', API_BASE + '/auth/login', {
            email,
            password
        });
        setAuth(data.data.token, data.data.name);
        window.location.href = '/dashboard';
    } catch (e) {
        showError((e as Error).message);
    }
}

function logout(): void {
    clearAuth();
    window.location.href = '/login';
}

async function loadDashboard(): Promise<void> {
    if (!guardPage()) return;
    clearError();
    try {
        const users = await apiCall<Array<{ id: string }>>('GET', API_BASE + '/users');
        let addressCount = 0;
        for (const u of users.data) {
            const addrs = await apiCall<unknown[]>(
                'GET',
                API_BASE + '/addresses/user/' + encodeURIComponent(u.id)
            );
            addressCount += addrs.data.length;
        }
        const usersEl = document.getElementById('total-users');
        const addrsEl = document.getElementById('total-addresses');
        if (usersEl) usersEl.textContent = String(users.data.length);
        if (addrsEl) addrsEl.textContent = String(addressCount);
    } catch (e) {
        showError((e as Error).message);
    }
}

async function loadUsers(): Promise<void> {
    if (!guardPage()) return;
    clearError();
    try {
        const data = await apiCall<
            Array<{ id: string; name: string; email: string; role: string; createdAt?: string }>
        >('GET', API_BASE + '/users');
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        for (const u of data.data) {
            tbody.appendChild(buildUserRow(u, u.id));
        }
    } catch (e) {
        showError((e as Error).message);
    }
}

function showUserForm(): void {
    const modal = document.getElementById('user-modal');
    if (modal) modal.classList.remove('hidden');
    const fe = document.getElementById('form-error');
    if (fe) fe.classList.add('hidden');
}

function hideUserForm(): void {
    const modal = document.getElementById('user-modal');
    if (modal) modal.classList.add('hidden');
}

async function createUser(): Promise<void> {
    const name = (document.getElementById('new-user-name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('new-user-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('new-user-password') as HTMLInputElement).value;
    const validationError = validateNewUser(name, email, password);
    if (validationError) {
        showFormError(validationError);
        return;
    }
    try {
        await apiCall('POST', API_BASE + '/auth/register', { name, email, password });
        hideUserForm();
        void loadUsers();
    } catch (e) {
        showFormError((e as Error).message);
    }
}

async function deleteUser(id: string): Promise<void> {
    if (!window.confirm('Delete this user and all their addresses?')) return;
    try {
        await apiCall('DELETE', API_BASE + '/users/' + encodeURIComponent(id));
        void loadUsers();
    } catch (e) {
        showError((e as Error).message);
    }
}

function initDeleteDelegation(): void {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.addEventListener('click', (e) => {
        const button = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-delete-user]');
        if (!button) return;
        const id = button.getAttribute('data-delete-user');
        if (id) void deleteUser(id);
    });
}

declare global {
    interface Window {
        doLogin: typeof doLogin;
        logout: typeof logout;
        showUserForm: typeof showUserForm;
        hideUserForm: typeof hideUserForm;
        createUser: typeof createUser;
        deleteUser: typeof deleteUser;
        loadUsers: typeof loadUsers;
        loadDashboard: typeof loadDashboard;
        escapeHtml: typeof escapeHtml;
    }
}

window.doLogin = doLogin;
window.logout = logout;
window.showUserForm = showUserForm;
window.hideUserForm = hideUserForm;
window.createUser = createUser;
window.deleteUser = deleteUser;
window.loadUsers = loadUsers;
window.loadDashboard = loadDashboard;

document.addEventListener('DOMContentLoaded', () => {
    void (async () => {
        const path = window.location.pathname;
        if (path === '/login') {
            if (isAuthenticated()) {
                window.location.href = '/dashboard';
                return;
            }
            const pw = document.getElementById('password');
            if (pw) {
                pw.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') void doLogin();
                });
            }
        } else if (path === '/dashboard') {
            void loadDashboard();
        } else if (path === '/users') {
            initDeleteDelegation();
            void loadUsers();
        } else if (path === '/about') {
            guardPage();
        }
    })();
});
