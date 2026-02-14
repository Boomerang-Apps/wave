import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterForm } from '../components/RegisterForm';

// Mock the auth wrapper
const mockSignUp = vi.fn();
vi.mock('../lib/supabase-auth', () => ({
  authSignUp: (...args: unknown[]) => mockSignUp(...args),
  GENERIC_AUTH_ERROR: 'Authentication failed. Please check your credentials and try again.',
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email, password, confirm password inputs and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render a link to the login page', () => {
    renderForm();

    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should call signUp on valid submission and show success message (AC-01)', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'securepassword123',
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i).length).toBeGreaterThan(0);
    });
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show error when password is less than 10 characters', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should show error when email is empty', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/^password$/i), 'securepassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should disable submit button during submission', async () => {
    const user = userEvent.setup();
    let resolveSignUp: (value: unknown) => void;
    mockSignUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      })
    );

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();

    resolveSignUp!({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i).length).toBeGreaterThan(0);
    });
  });

  it('should display error on signup failure', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Authentication failed. Please check your credentials and try again.' },
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'securepassword123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
