import { useState } from 'react';
import type { FormEvent } from 'react';
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
import type { Address } from '../api/types';

const ADDRESS_TYPES = ['HOME', 'WORK', 'BILLING', 'SHIPPING'];

interface AddressFormDialogProps {
  open: boolean;
  address: Address | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddressFormDialog({
  open,
  address,
  userId,
  onClose,
  onSaved
}: AddressFormDialogProps) {
  const editing = address !== null;
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState('HOME');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [lastOpen, setLastOpen] = useState<boolean | null>(null);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setStreet(address?.street ?? '');
      setCity(address?.city ?? '');
      setState(address?.state ?? '');
      setZipCode(address?.zipCode ?? '');
      setCountry(address?.country ?? '');
      setType(address?.type ?? 'HOME');
      setError('');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!street.trim() || !city.trim() || !zipCode.trim() || !country.trim()) {
      setError('Street, city, zip code, and country are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const payload = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim() || undefined,
      zipCode: zipCode.trim(),
      country: country.trim(),
      type
    };
    try {
      if (editing) {
        await apiCall('PUT', '/addresses/' + address!.id, payload);
      } else {
        await apiCall('POST', '/addresses', { userId, ...payload });
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
      <DialogTitle>{editing ? 'Edit Address' : 'Add Address'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} id="address-form" noValidate>
          <TextField
            label="Street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            fullWidth
            margin="normal"
            autoFocus
          />
          <TextField
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Zip Code"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Type"
            select
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
            margin="normal"
          >
            {ADDRESS_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="address-form" variant="contained" disabled={submitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
