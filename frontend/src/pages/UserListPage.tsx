import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { Address, User } from '../api/types';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import UserFormDialog from '../components/UserFormDialog';

export default function UserListPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [previews, setPreviews] = useState<Record<string, Address[] | null>>({});
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const previewFetches = useRef<Set<string>>(new Set());

  const loadUsers = useCallback(async () => {
    previewFetches.current.clear();
    setPreviews({});
    try {
      const response = await apiCall<User[]>('GET', '/users');
      setUsers(response.data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleRowHover(u: User) {
    setHoveredUserId(u.id);
    if (previewFetches.current.has(u.id)) {
      return;
    }
    previewFetches.current.add(u.id);
    try {
      const response = await apiCall<Address[]>('GET', '/addresses/user/' + u.id);
      setPreviews((prev) => ({ ...prev, [u.id]: response.data }));
    } catch {
      previewFetches.current.delete(u.id);
      setPreviews((prev) => ({ ...prev, [u.id]: null }));
    }
  }

  function previewContent(u: User) {
    const list = previews[u.id];
    if (list === null) {
      return <Typography variant="body2">Could not load addresses</Typography>;
    }
    if (!list) {
      return <Typography variant="body2">Loading addresses...</Typography>;
    }
    if (list.length === 0) {
      return <Typography variant="body2">No addresses</Typography>;
    }
    return (
      <Box>
        {list.map((a) => (
          <Typography key={a.id} variant="body2">
            {a.street}, {a.city} {a.zipCode} ({a.type ?? 'HOME'})
          </Typography>
        ))}
      </Box>
    );
  }

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
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            User &amp; Address Management
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }} data-testid="nav-user-name">
            {user ? user.firstName + ' ' + user.lastName : ''}
          </Typography>
          <Button component={Link} to="/about">
            About
          </Button>
          <Button onClick={handleLogout}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Users
          </Typography>
          {isAdmin && (
            <Button variant="contained" onClick={() => setAddOpen(true)}>
              Add User
            </Button>
          )}
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
              {users.map((u) => {
                const isHovered = hoveredUserId === u.id;
                return (
                  <TableRow
                    key={u.id}
                    hover
                    onMouseEnter={() => void handleRowHover(u)}
                    onMouseLeave={() => setHoveredUserId(null)}
                    onFocus={() => void handleRowHover(u)}
                    onBlur={() => setHoveredUserId(null)}
                    onClick={() => navigate('/users/' + u.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {isHovered ? (
                      <TableCell
                        key="main"
                        colSpan={4}
                        sx={{ bgcolor: 'action.hover' }}
                        aria-live="polite"
                      >
                        {previewContent(u)}
                      </TableCell>
                    ) : (
                      <>
                        <TableCell key="email">{u.email}</TableCell>
                        <TableCell key="firstName">{u.firstName}</TableCell>
                        <TableCell key="lastName">{u.lastName}</TableCell>
                        <TableCell key="role">{u.role}</TableCell>
                      </>
                    )}
                    <TableCell key="actions" align="right">
                      <Button
                        size="small"
                        component={Link}
                        to={'/users/' + u.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Manage
                      </Button>
                      {isAdmin && (
                        <Button
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(u);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
            ? 'Delete ' +
              deleteTarget.firstName +
              ' ' +
              deleteTarget.lastName +
              ' and all their addresses? This cannot be undone.'
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
