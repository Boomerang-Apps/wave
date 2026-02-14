import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';

// Capture the onAuthStateChange callback
let authStateCallback: (event: string, session: unknown) => void;
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
  },
}));

import { supabase } from '@/lib/supabase';

const mockGetSession = vi.mocked(supabase.auth.getSession);

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('should throw when used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });

  it('should return null user and session initially when no session exists', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should set loading to true initially then false after getSession resolves', async () => {
    // Delay resolution to observe loading state
    let resolveSession: (value: unknown) => void;
    mockGetSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }) as never
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveSession!({
        data: { session: null },
        error: null,
      });
    });

    expect(result.current.loading).toBe(false);
  });

  it('should restore existing session on mount', async () => {
    const mockSession = {
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      user: { id: 'user-1', email: 'test@example.com' },
    };

    mockGetSession.mockResolvedValue({
      data: { session: mockSession as never },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(result.current.session).toEqual(mockSession);
  });

  it('should subscribe to onAuthStateChange (AC-04)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    expect(authStateCallback).toBeDefined();
  });

  it('should update state on SIGNED_IN event (AC-04)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newSession = {
      access_token: 'new-token',
      refresh_token: 'new-refresh',
      user: { id: 'user-2', email: 'new@example.com' },
    };

    act(() => {
      authStateCallback('SIGNED_IN', newSession);
    });

    expect(result.current.user).toEqual({ id: 'user-2', email: 'new@example.com' });
    expect(result.current.session).toEqual(newSession);
  });

  it('should clear state on SIGNED_OUT event (AC-04)', async () => {
    const mockSession = {
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      user: { id: 'user-1', email: 'test@example.com' },
    };

    mockGetSession.mockResolvedValue({
      data: { session: mockSession as never },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    act(() => {
      authStateCallback('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should unsubscribe on unmount', async () => {
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should expose signOut function', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.signOut).toBe('function');
  });
});
