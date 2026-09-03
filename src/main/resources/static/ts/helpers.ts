import type { UserDto } from './api';

export function escapeHtml(text: string | null | undefined): string {
    if (text === null || text === undefined) {
        return '';
    }
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function roleBadge(role: string): string {
    const isAdmin = role === 'ADMIN';
    const cls = isAdmin ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-700/40 text-slate-300';
    return '<span class="rounded px-1.5 py-0.5 text-xs ' + cls + '">' + escapeHtml(role) + '</span>';
}

export function buildUserRow(user: UserDto, id: string): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.innerHTML =
        '<td class="px-4 py-3 text-slate-200">' +
        escapeHtml(user.name) +
        '</td>' +
        '<td class="px-4 py-3 text-slate-400">' +
        escapeHtml(user.email) +
        '</td>' +
        '<td class="px-4 py-3">' +
        roleBadge(user.role) +
        '</td>' +
        '<td class="px-4 py-3 text-slate-400">' +
        escapeHtml(user.createdAt || '') +
        '</td>' +
        '<td class="px-4 py-3"><button onclick="window.deleteUser(\'' +
        escapeHtml(id) +
        '\')" ' +
        'class="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded px-2 py-1">Delete</button></td>';
    return tr;
}

export function validateLogin(email: string, password: string): string | null {
    if (!email || !password) {
        return 'Email and password are required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Please enter a valid email address';
    }
    return null;
}

export function validateNewUser(name: string, email: string, password: string): string | null {
    if (!name || !email || !password) {
        return 'All fields are required';
    }
    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    return null;
}
