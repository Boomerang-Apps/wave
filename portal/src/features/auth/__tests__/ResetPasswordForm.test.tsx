import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { GENERIC_AUTH_ERROR } from '../lib/supabase-auth';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../lib/supabase-auth', async () => {
  const actual = await vi.importActual('../lib/supabase-auth');
  return {
    ...actual,
    authUpdatePassword: vi.fn(),
  };
});

import { authUpdatePassword } from '../lib/supabase-auth';

const mockAuthUpdatePassword = vi.mocked(authUpdatePassword);

function renderForm(): ReturnType<typeof render> {
  return render(
    <BrowserRouter>
      <ResetPasswordForm />
    </BrowserRouter>
  );
}

describe('ResetPasswordForm (AC-03, AC-04, AC-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders password and confirm password inputs', () => {
    renderForm();

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('validates password minimum 10 characters (AC-03)', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(mockAuthUpdatePassword).not.toHaveBeenCalled();
  });

  it('validates password confirmation matches (AC-03)', async () => {
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockAuthUpdatePassword).not.toHaveBeenCalled();
  });

  it('calls authUpdatePassword on valid submission (AC-03)', async () => {
    const user = userEvent.setup();
    mockAuthUpdatePassword.mockResolvedValue({ data: { updated: true }, error: null });

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(mockAuthUpdatePassword).toHaveBeenCalledWith({ password: 'newpassword123' });
  });

  it('navigates to /login on success (AC-04)', async () => {
    const user = userEvent.setup();
    mockAuthUpdatePassword.mockResolvedValue({ data: { updated: true }, error: null });

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({
      state: expect.objectContaining({ passwordReset: true }),
    }));
  });

  it('shows generic error on failure (AC-05)', async () => {
    const user = userEvent.setup();
    mockAuthUpdatePassword.mockResolvedValue({
      data: null,
      error: { message: GENERIC_AUTH_ERROR },
    });

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(GENERIC_AUTH_ERROR)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => { resolvePromise = resolve; });
    mockAuthUpdatePassword.mockReturnValue(promise as ReturnType<typeof authUpdatePassword>);

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled();

    resolvePromise!({ data: { updated: true }, error: null });
  });

  it('clears error on new input', async () => {
    const user = userEvent.setup();
    mockAuthUpdatePassword.mockResolvedValue({
      data: null,
      error: { message: GENERIC_AUTH_ERROR },
    });

    renderForm();

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByText(GENERIC_AUTH_ERROR)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), 'x');

    expect(screen.queryByText(GENERIC_AUTH_ERROR)).not.toBeInTheDocument();
  });
});
