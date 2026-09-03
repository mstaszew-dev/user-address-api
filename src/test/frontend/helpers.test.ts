import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    escapeHtml,
    roleBadge,
    buildUserRow,
    validateLogin,
    validateNewUser
} from '../../main/resources/static/ts/helpers';

describe('helpers', () => {
    describe('escapeHtml', () => {
        it('escapes special characters', () => {
            expect(escapeHtml('<script>&"\'')).toBe('&lt;script&gt;&amp;&quot;&#039;');
        });

        it('returns empty string for null/undefined', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });

        it('returns plain text unchanged', () => {
            expect(escapeHtml('hello world')).toBe('hello world');
        });
    });

    describe('roleBadge', () => {
        it('renders admin badge for ADMIN role', () => {
            const html = roleBadge('ADMIN');
            expect(html).toContain('bg-cyan-500/15');
            expect(html).toContain('ADMIN');
        });

        it('renders plain badge for non-admin role', () => {
            const html = roleBadge('USER');
            expect(html).toContain('bg-slate-700/40');
            expect(html).toContain('USER');
        });

        it('escapes role content', () => {
            const html = roleBadge('<b>');
            expect(html).toContain('&lt;b&gt;');
        });
    });

    describe('validateLogin', () => {
        it('returns null for valid input', () => {
            expect(validateLogin('a@b.com', 'password')).toBeNull();
        });

        it('requires email', () => {
            expect(validateLogin('', 'password')).toBe('Email and password are required');
        });

        it('requires password', () => {
            expect(validateLogin('a@b.com', '')).toBe('Email and password are required');
        });

        it('rejects invalid email format', () => {
            expect(validateLogin('not-an-email', 'password')).toContain('valid email');
        });
    });

    describe('validateNewUser', () => {
        it('returns null for valid input', () => {
            expect(validateNewUser('Alice', 'a@b.com', 'password123')).toBeNull();
        });

        it('requires all fields', () => {
            expect(validateNewUser('', 'a@b.com', 'password')).toBe('All fields are required');
            expect(validateNewUser('Alice', '', 'password')).toBe('All fields are required');
            expect(validateNewUser('Alice', 'a@b.com', '')).toBe('All fields are required');
        });

        it('enforces minimum password length', () => {
            expect(validateNewUser('Alice', 'a@b.com', '12345')).toBe(
                'Password must be at least 6 characters'
            );
        });
    });

    describe('buildUserRow', () => {
        beforeEach(() => {
            document.body.innerHTML = '<table><tbody id="tbody"></tbody></table>';
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('builds a table row with escaped user data', () => {
            const tr = buildUserRow(
                { id: 'u1', name: '<Alice>', email: 'a@b.com', role: 'USER', createdAt: '2024-01-01' },
                'u1'
            );
            expect(tr.innerHTML).toContain('&lt;Alice&gt;');
            expect(tr.innerHTML).toContain('a@b.com');
            expect(tr.innerHTML).toContain('USER');
            expect(tr.innerHTML).toContain('2024-01-01');
            const button = tr.querySelector('button');
            expect(button).not.toBeNull();
            expect(button?.getAttribute('data-delete-user')).toBe('u1');
            expect(button?.textContent).toBe('Delete');
        });

        it('does not interpolate the id into an inline onclick handler (XSS-safe)', () => {
            const malicious = "u1');alert(1);//";
            const tr = buildUserRow(
                { id: malicious, name: 'A', email: 'a@b.com', role: 'USER', createdAt: 'd' },
                malicious
            );
            expect(tr.querySelector('button[onclick]')).toBeNull();
            expect(tr.innerHTML).not.toMatch(/onclick=/);
            const button = tr.querySelector('button');
            expect(button?.getAttribute('data-delete-user')).toBe(malicious);
            expect(button?.hasAttribute('onclick')).toBe(false);
        });
    });
});
