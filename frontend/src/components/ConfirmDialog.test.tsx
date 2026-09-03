import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title and message', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete user"
        message="This cannot be undone."
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Delete user')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Delete user"
        message="Sure?"
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Delete user"
        message="Sure?"
        onConfirm={() => {}}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete user"
        message="Sure?"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText('Delete user')).not.toBeInTheDocument();
  });
});
