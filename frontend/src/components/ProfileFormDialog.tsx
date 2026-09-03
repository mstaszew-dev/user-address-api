import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField
} from '@mui/material';
import { apiCall } from '../api/client';
import type { User } from '../api/types';

interface ProfileFormDialogProps {
  open: boolean;
  user: User;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProfileFormDialog({ open, user, onClose, onSaved }: ProfileFormDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setRole(user.role);
      setError('');
    }
  }, [open, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const updates: Record<string, string> = {};
    if (firstName.trim() !== user.firstName) updates.firstName = firstName.trim();
    if (lastName.trim() !== user.lastName) updates.lastName = lastName.trim();
    if (email.trim() !== user.email) updates.email = email.trim();
    if (role !== user.role) updates.role = role;
    try {
      if (Object.keys(updates).length > 0) {
        await apiCall('PUT', '/users/' + user.id, updates);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} id="profile-form" noValidate>
          <TextField
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            margin="normal"
            autoFocus
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Role"
            select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            fullWidth
            margin="normal"
          >
            <MenuItem value="USER">USER</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="profile-form" variant="contained" disabled={submitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
