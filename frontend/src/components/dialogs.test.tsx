import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AddressFormDialog from './AddressFormDialog';
import ConfirmDialog from './ConfirmDialog';
import ProfileFormDialog from './ProfileFormDialog';
import UserFormDialog from './UserFormDialog';
import type { Address, User } from '../api/types';

const user: User = {
  id: 'u1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@test.com',
  role: 'USER'
};
const address: Address = {
  id: 'a1',
  userId: 'u1',
  street: '1 Main St',
  city: 'Tel Aviv',
  zipCode: '61000',
  country: 'IL',
  type: 'HOME'
};

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe('UserFormDialog error paths', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows validation error when fields are empty', async () => {
    const actor = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<UserFormDialog open={true} onClose={() => {}} onSaved={() => {}} />);

    await actor.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows backend error when registration fails', async () => {
    const actor = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: false, message: 'Email already registered', data: null }, 409)
        )
    );
    render(<UserFormDialog open={true} onClose={() => {}} onSaved={() => {}} />);

    await actor.type(screen.getByLabelText(/first name/i), 'Bob');
    await actor.type(screen.getByLabelText(/last name/i), 'Jones');
    await actor.type(screen.getByLabelText(/email/i), 'taken@test.com');
    await actor.type(screen.getByLabelText(/password/i), 'secret1');
    await actor.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
  });
});

describe('AddressFormDialog error paths', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows validation error when required fields are missing', async () => {
    const actor = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <AddressFormDialog
        open={true}
        address={null}
        userId="u1"
        onClose={() => {}}
        onSaved={() => {}}
      />
    );

    await actor.type(screen.getByLabelText(/street/i), '1 Main St');
    await actor.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows backend error when address creation fails', async () => {
    const actor = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: false, message: 'User not found', data: null }, 404)
        )
    );
    render(
      <AddressFormDialog
        open={true}
        address={null}
        userId="missing"
        onClose={() => {}}
        onSaved={() => {}}
      />
    );

    await actor.type(screen.getByLabelText(/street/i), '1 Main St');
    await actor.type(screen.getByLabelText(/^city/i), 'Tel Aviv');
    await actor.type(screen.getByLabelText(/zip code/i), '61000');
    await actor.type(screen.getByLabelText(/country/i), 'IL');
    await actor.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found');
  });

  it('prefills fields when editing an existing address', async () => {
    render(
      <AddressFormDialog
        open={true}
        address={address}
        userId="u1"
        onClose={() => {}}
        onSaved={() => {}}
      />
    );

    expect(await screen.findByLabelText(/street/i)).toHaveValue('1 Main St');
    expect(screen.getByLabelText(/^city/i)).toHaveValue('Tel Aviv');
  });
});

describe('ProfileFormDialog error paths', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows validation error when names are cleared', async () => {
    const actor = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfileFormDialog open={true} user={user} onClose={() => {}} onSaved={() => {}} />);

    await actor.clear(screen.getByLabelText(/first name/i));
    await actor.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the API call when nothing changed', async () => {
    const actor = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfileFormDialog open={true} user={user} onClose={() => {}} onSaved={() => {}} />);

    await actor.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it('shows backend error when profile update fails', async () => {
    const actor = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: false, message: 'Email already in use', data: null }, 409)
        )
    );
    render(<ProfileFormDialog open={true} user={user} onClose={() => {}} onSaved={() => {}} />);

    await actor.clear(screen.getByLabelText(/last name/i));
    await actor.type(screen.getByLabelText(/last name/i), 'NewName');
    await actor.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already in use');
  });
});

describe('ConfirmDialog rendering', () => {
  it('renders title and message', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete user"
        message="Sure?"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Delete user')).toBeInTheDocument();
    expect(screen.getByText('Sure?')).toBeInTheDocument();
  });
});
