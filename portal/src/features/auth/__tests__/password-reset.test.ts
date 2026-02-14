import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authResetPassword, authUpdatePassword, GENERIC_AUTH_ERROR } from '../lib/supabase-auth';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';

const mockResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail);
const mockUpdateUser = vi.mocked(supabase.auth.updateUser);

describe('Password Reset Wrapper (AC-01, AC-02, AC-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authResetPassword', () => {
    it('calls supabase.auth.resetPasswordForEmail with email and redirectTo', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await authResetPassword({ email: 'user@example.com' });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
      );
    });

    it('returns success even when Supabase returns error (no user enumeration)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'User not found', name: 'AuthError', status: 404 },
      });

      const result = await authResetPassword({ email: 'nonexistent@example.com' });

      expect(result.data).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns success on valid email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const result = await authResetPassword({ email: 'user@example.com' });

      expect(result.data).toEqual({ sent: true });
      expect(result.error).toBeNull();
    });

    it('returns success even on network error (no user enumeration)', async () => {
      mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'));

      const result = await authResetPassword({ email: 'user@example.com' });

      expect(result.data).toEqual({ sent: true });
      expect(result.error).toBeNull();
    });
  });

  describe('authUpdatePassword', () => {
    it('calls supabase.auth.updateUser with new password', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: '123', email: 'user@example.com' } },
        error: null,
      });

      await authUpdatePassword({ password: 'newpassword123' });

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    });

    it('returns success on valid password update', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: '123', email: 'user@example.com' } },
        error: null,
      });

      const result = await authUpdatePassword({ password: 'newpassword123' });

      expect(result.data).toEqual({ updated: true });
      expect(result.error).toBeNull();
    });

    it('returns sanitized error on failure', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too weak', name: 'AuthError', status: 422 },
      });

      const result = await authUpdatePassword({ password: 'short' });

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
    });

    it('returns sanitized error on exception', async () => {
      mockUpdateUser.mockRejectedValue(new Error('Network failure'));

      const result = await authUpdatePassword({ password: 'newpassword123' });

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
    });
  });

  describe('Error sanitization (AC-05)', () => {
    it('error messages never contain sensitive words', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid email or password not found', name: 'AuthError', status: 400 },
      });

      const result = await authUpdatePassword({ password: 'test' });

      expect(result.error!.message).not.toMatch(/email/i);
      expect(result.error!.message).not.toMatch(/not found/i);
      expect(result.error!.message).toBe(GENERIC_AUTH_ERROR);
    });
  });
});
