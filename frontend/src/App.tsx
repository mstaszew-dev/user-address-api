import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import RequireAuth from './components/RequireAuth';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import UserDetailPage from './pages/UserDetailPage';
import UserListPage from './pages/UserListPage';

const theme = createTheme({ palette: { mode: 'dark' } });

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <UserListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/users/:id"
        element={
          <RequireAuth>
            <UserDetailPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
