import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

vi.mock('../lib/supabase-auth', () => ({
  authResetPassword: vi.fn(),
}));

import { authResetPassword } from '../lib/supabase-auth';

const mockAuthResetPassword = vi.mocked(authResetPassword);

function renderForm(): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <ForgotPasswordForm />
    </BrowserRouter>
  );
}

describe('ForgotPasswordForm (AC-01, AC-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders back to login link', () => {
    renderForm();

    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
  });

  it('calls authResetPassword on valid submission (AC-01)', async () => {
    const user = userEvent.setup();
    mockAuthResetPassword.mockResolvedValue({ data: { sent: true }, error: null });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(mockAuthResetPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('shows success message after submission', async () => {
    const user = userEvent.setup();
    mockAuthResetPassword.mockResolvedValue({ data: { sent: true }, error: null });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/password reset link/i)).toBeInTheDocument();
  });

  it('shows same success message for any email — no user enumeration (AC-02)', async () => {
    const user = userEvent.setup();
    // Even when reset "fails" internally, authResetPassword always returns success
    mockAuthResetPassword.mockResolvedValue({ data: { sent: true }, error: null });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    mockAuthResetPassword.mockReturnValue(promise as ReturnType<typeof authResetPassword>);

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();

    resolvePromise!({ data: { sent: true }, error: null });
  });

  it('validates empty email', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(mockAuthResetPassword).not.toHaveBeenCalled();
  });
});
