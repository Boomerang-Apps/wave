import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authSignUp, authSignIn, authSignOut, authGetSession, GENERIC_AUTH_ERROR } from '../lib/supabase-auth';

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';

const mockSignUp = vi.mocked(supabase.auth.signUp);
const mockSignIn = vi.mocked(supabase.auth.signInWithPassword);
const mockSignOut = vi.mocked(supabase.auth.signOut);
const mockGetSession = vi.mocked(supabase.auth.getSession);

describe('supabase-auth wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GENERIC_AUTH_ERROR', () => {
    it('should be a generic message that does not reveal field details', () => {
      expect(GENERIC_AUTH_ERROR).toBeDefined();
      expect(GENERIC_AUTH_ERROR.toLowerCase()).not.toContain('email');
      expect(GENERIC_AUTH_ERROR.toLowerCase()).not.toContain('password');
      expect(GENERIC_AUTH_ERROR.toLowerCase()).not.toContain('not found');
    });
  });

  describe('authSignUp', () => {
    it('should call supabase.auth.signUp with email and password', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' } as never,
          session: null,
        },
        error: null,
      });

      await authSignUp({ email: 'test@example.com', password: 'securepassword123' });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'securepassword123',
      });
    });

    it('should return normalized user data on success', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' } as never,
          session: null,
        },
        error: null,
      });

      const result = await authSignUp({ email: 'test@example.com', password: 'securepassword123' });

      expect(result.data).toEqual({
        user: { id: 'user-1', email: 'test@example.com' },
      });
      expect(result.error).toBeNull();
    });

    it('should return sanitized error on failure (AC-03)', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User with this email already exists', status: 422 } as never,
      });

      const result = await authSignUp({ email: 'test@example.com', password: 'securepassword123' });

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
      expect(result.data).toBeNull();
    });

    it('should sanitize error messages that contain "email"', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email format', status: 400 } as never,
      });

      const result = await authSignUp({ email: 'bad', password: 'securepassword123' });

      expect(result.error?.message).toBe(GENERIC_AUTH_ERROR);
      expect(result.error?.message.toLowerCase()).not.toContain('email');
    });

    it('should handle thrown exceptions with sanitized error', async () => {
      mockSignUp.mockRejectedValue(new Error('Network failure'));

      const result = await authSignUp({ email: 'test@example.com', password: 'securepassword123' });

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
      expect(result.data).toBeNull();
    });
  });

  describe('authSignIn', () => {
    it('should call supabase.auth.signInWithPassword with email and password', async () => {
      mockSignIn.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' } as never,
          session: {
            access_token: 'token-1',
            refresh_token: 'refresh-1',
            user: { id: 'user-1', email: 'test@example.com' },
          } as never,
        },
        error: null,
      });

      await authSignIn({ email: 'test@example.com', password: 'securepassword123' });

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'securepassword123',
      });
    });

    it('should return session and user on success', async () => {
      mockSignIn.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' } as never,
          session: {
            access_token: 'token-1',
            refresh_token: 'refresh-1',
            user: { id: 'user-1', email: 'test@example.com' },
          } as never,
        },
        error: null,
      });

      const result = await authSignIn({ email: 'test@example.com', password: 'securepassword123' });

      expect(result.data).toEqual({
        user: { id: 'user-1', email: 'test@example.com' },
        session: {
          access_token: 'token-1',
          refresh_token: 'refresh-1',
          user: { id: 'user-1', email: 'test@example.com' },
        },
      });
      expect(result.error).toBeNull();
    });

    it('should return sanitized error on invalid credentials (AC-03)', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 } as never,
      });

      const result = await authSignIn({ email: 'test@example.com', password: 'wrong' });

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
      expect(result.data).toBeNull();
    });

    it('should not reveal whether email or password was wrong (AC-03)', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not found in our system', status: 404 } as never,
      });

      const result = await authSignIn({ email: 'nobody@example.com', password: 'pass' });

      expect(result.error?.message.toLowerCase()).not.toContain('email');
      expect(result.error?.message.toLowerCase()).not.toContain('password');
      expect(result.error?.message.toLowerCase()).not.toContain('not found');
    });

    it('should handle thrown exceptions with sanitized error', async () => {
      mockSignIn.mockRejectedValue(new Error('Connection refused'));

      const result = await authSignIn({ email: 'test@example.com', password: 'pass' });

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
      expect(result.data).toBeNull();
    });
  });

  describe('authSignOut', () => {
    it('should call supabase.auth.signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await authSignOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should return sanitized error on failure', async () => {
      mockSignOut.mockResolvedValue({
        error: { message: 'Session expired' } as never,
      });

      const result = await authSignOut();

      expect(result.error).toEqual({ message: GENERIC_AUTH_ERROR });
    });
  });

  describe('authGetSession', () => {
    it('should call supabase.auth.getSession', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await authGetSession();

      expect(mockGetSession).toHaveBeenCalled();
    });

    it('should return session when one exists', async () => {
      const mockSession = {
        access_token: 'token-1',
        refresh_token: 'refresh-1',
        user: { id: 'user-1', email: 'test@example.com' },
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession as never },
        error: null,
      });

      const result = await authGetSession();

      expect(result.data).toEqual({ session: mockSession });
      expect(result.error).toBeNull();
    });

    it('should return null session when none exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await authGetSession();

      expect(result.data).toEqual({ session: null });
      expect(result.error).toBeNull();
    });
  });
});
