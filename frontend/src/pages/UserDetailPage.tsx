import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Snackbar,
  Typography
} from '@mui/material';
import { apiCall } from '../api/client';
import type { Address, User } from '../api/types';
import AddressCard from '../components/AddressCard';
import { useAuth } from '../context/AuthContext';
import AddressFormDialog from '../components/AddressFormDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import ProfileFormDialog from '../components/ProfileFormDialog';

function initials(user: User): string {
  return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: sessionUser, updateSession } = useAuth();
  const isAdmin = sessionUser?.role === 'ADMIN';
  const [profile, setProfile] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const [profileRes, addressRes] = await Promise.all([
        apiCall<User>('GET', '/users/' + id),
        apiCall<Address[]>('GET', '/addresses/user/' + id)
      ]);
      setProfile(profileRes.data);
      setAddresses(addressRes.data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      void loadAll();
    }
    return () => {
      ignore = true;
    };
  }, [loadAll]);

  function openAddAddress() {
    setEditTarget(null);
    setAddressDialogOpen(true);
  }

  function openEditAddress(address: Address) {
    setEditTarget(address);
    setAddressDialogOpen(true);
  }

  async function handleDeleteAddress() {
    if (!deleteTarget?.id) return;
    try {
      await apiCall('DELETE', '/addresses/' + deleteTarget.id);
      setSnack('Address deleted');
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  }

  if (!profile && !error) {
    return null;
  }

  function handleProfileSaved(updated: User) {
    setProfile(updated);
    void loadAll();
    if (sessionUser && updated.id === sessionUser.userId) {
      updateSession({
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role
      });
    }
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button onClick={() => navigate('/users')} sx={{ mb: 2, mr: 1 }}>
          All users
        </Button>
        <Button component={Link} to="/about" sx={{ mb: 2 }}>
          About
        </Button>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="page-error">
            {error}
          </Alert>
        )}
        {profile && (
          <>
            <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                  {initials(profile)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h1">
                    {profile.firstName} {profile.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {profile.email}
                  </Typography>
                </Box>
                <Chip
                  label={profile.role}
                  color={profile.role === 'ADMIN' ? 'secondary' : 'default'}
                />
                {isAdmin && (
                  <Button variant="outlined" onClick={() => setProfileEditOpen(true)}>
                    Edit Profile
                  </Button>
                )}
              </Box>
            </Paper>

            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" component="h2">
                Addresses ({addresses.length})
              </Typography>
              {isAdmin && (
                <Button variant="contained" onClick={openAddAddress}>
                  Add Address
                </Button>
              )}
            </Box>
            {addresses.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No addresses yet. Add one to get started.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {addresses.map((a) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={a.id}>
                    <AddressCard
                      address={a}
                      canEdit={isAdmin}
                      onEdit={openEditAddress}
                      onDelete={setDeleteTarget}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>

      {profile && (
        <ProfileFormDialog
          open={profileEditOpen}
          user={profile}
          onClose={() => setProfileEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
      <AddressFormDialog
        open={addressDialogOpen}
        address={editTarget}
        userId={id ?? ''}
        onClose={() => setAddressDialogOpen(false)}
        onSaved={loadAll}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete address"
        message={
          deleteTarget
            ? 'Delete the address at ' + deleteTarget.street + '? This cannot be undone.'
            : ''
        }
        onConfirm={handleDeleteAddress}
        onClose={() => setDeleteTarget(null)}
      />
      <Snackbar
        open={snack !== ''}
        autoHideDuration={3000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
