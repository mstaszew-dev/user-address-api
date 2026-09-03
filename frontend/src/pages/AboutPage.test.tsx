import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import AboutPage from './AboutPage';

function renderPage(initialPath = '/about') {
  const theme = createTheme({ palette: { mode: 'dark' } });
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/users" element={<div>users list</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('AboutPage', () => {
  it('renders the about heading and stack overview', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByText(/built with React and Material UI/i)).toBeInTheDocument();
    expect(screen.getByText(/Spring Boot REST API/i)).toBeInTheDocument();
  });

  it('lists the design choices for the user to address flow', () => {
    renderPage();
    expect(screen.getByText(/design choices/i)).toBeInTheDocument();
    expect(screen.getByText(/one user can hold multiple addresses/i)).toBeInTheDocument();
    expect(screen.getByText(/refetched after each mutation/i)).toBeInTheDocument();
  });

  it('navigates back to the users list', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /back to users/i }));
    expect(await screen.findByText('users list')).toBeInTheDocument();
  });
});
