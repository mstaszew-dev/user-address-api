import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography
} from '@mui/material';
import { apiCall } from '../api/client';
import type { User } from '../api/types';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import UserFormDialog from '../components/UserFormDialog';

export default function UserListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiCall<User[]>('GET', '/users');
      setUsers(response.data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiCall('DELETE', '/users/' + deleteTarget.id);
      setSnack('User deleted');
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            User &amp; Address Management
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }} data-testid="nav-user-name">
            {user ? user.firstName + ' ' + user.lastName : ''}
          </Typography>
          <Button onClick={handleLogout}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Users
          </Typography>
          <Button variant="contained" onClick={() => setAddOpen(true)}>
            Add User
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="page-error">
            {error}
          </Alert>
        )}
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.firstName}</TableCell>
                  <TableCell>{u.lastName}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell align="right">
                    <Button size="small" component={Link} to={'/users/' + u.id}>
                      Manage
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(u)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && !error && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
      <UserFormDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadUsers} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user"
        message={
          deleteTarget
            ? 'Delete ' + deleteTarget.firstName + ' ' + deleteTarget.lastName + ' and all their addresses? This cannot be undone.'
            : ''
        }
        onConfirm={handleDelete}
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
