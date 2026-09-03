import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

function renderAt(path: string) {
  const theme = createTheme({ palette: { mode: 'dark' } });
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('App routing', () => {
  it('redirects root to login', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users from /users to login', async () => {
    renderAt('/users');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders about page publicly', async () => {
    renderAt('/about');
    expect(await screen.findByRole('heading', { name: /about/i })).toBeInTheDocument();
  });
});
