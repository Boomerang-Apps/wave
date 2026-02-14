import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the auth wrapper
const mockSignIn = vi.fn();
vi.mock('../lib/supabase-auth', () => ({
  authSignIn: (...args: unknown[]) => mockSignIn(...args),
  GENERIC_AUTH_ERROR: 'Authentication failed. Please check your credentials and try again.',
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email and password inputs and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render a link to the register page', () => {
    renderForm();

    const registerLink = screen.getByRole('link', { name: /create account/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('should call signIn and navigate to / on success (AC-02)', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'test@example.com' },
        session: { access_token: 'token', refresh_token: 'refresh', user: { id: 'user-1', email: 'test@example.com' } },
      },
      error: null,
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'securepassword123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display generic error on failure (AC-03)', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Authentication failed. Please check your credentials and try again.' },
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const alertText = screen.getByRole('alert').textContent!;
    expect(alertText.toLowerCase()).not.toContain('email');
    expect(alertText.toLowerCase()).not.toContain('password');
    expect(alertText.toLowerCase()).not.toContain('not found');
  });

  it('should not navigate on failed login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Authentication failed. Please check your credentials and try again.' },
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveSignIn: (value: unknown) => void;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    resolveSignIn!({
      data: {
        user: { id: 'user-1', email: 'test@example.com' },
        session: { access_token: 'token', refresh_token: 'refresh', user: { id: 'user-1', email: 'test@example.com' } },
      },
      error: null,
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should clear error when user types new input', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Authentication failed. Please check your credentials and try again.' },
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), 'a');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
