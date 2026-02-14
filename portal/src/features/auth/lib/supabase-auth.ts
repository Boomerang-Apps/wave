import { supabase } from '@/lib/supabase';
import type { IAuthError, IAuthUser, IAuthSession, ISignUpCredentials, ISignInCredentials, IForgotPasswordCredentials, IResetPasswordCredentials } from '../types/auth';

export const GENERIC_AUTH_ERROR = 'Authentication failed. Please check your credentials and try again.';

interface IAuthResult<T> {
  data: T | null;
  error: IAuthError | null;
}

function sanitizeError(): IAuthError {
  return { message: GENERIC_AUTH_ERROR };
}

export async function authSignUp(
  credentials: ISignUpCredentials
): Promise<IAuthResult<{ user: IAuthUser }>> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { data: null, error: sanitizeError() };
    }

    return {
      data: {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
        },
      },
      error: null,
    };
  } catch {
    return { data: null, error: sanitizeError() };
  }
}

export async function authSignIn(
  credentials: ISignInCredentials
): Promise<IAuthResult<{ user: IAuthUser; session: IAuthSession }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { data: null, error: sanitizeError() };
    }

    return {
      data: {
        user: {
          id: data.user.id,
          email: data.user.email!,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: {
            id: data.user.id,
            email: data.user.email!,
          },
        },
      },
      error: null,
    };
  } catch {
    return { data: null, error: sanitizeError() };
  }
}

export async function authSignOut(): Promise<IAuthResult<null>> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: sanitizeError() };
    }

    return { data: null, error: null };
  } catch {
    return { data: null, error: sanitizeError() };
  }
}

export async function authResetPassword(
  credentials: IForgotPasswordCredentials
): Promise<IAuthResult<{ sent: boolean }>> {
  try {
    await supabase.auth.resetPasswordForEmail(credentials.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Always return success to prevent user enumeration (AC-02)
    return { data: { sent: true }, error: null };
  } catch {
    // Even on error, return success to prevent user enumeration
    return { data: { sent: true }, error: null };
  }
}

export async function authUpdatePassword(
  credentials: IResetPasswordCredentials
): Promise<IAuthResult<{ updated: boolean }>> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: credentials.password,
    });

    if (error) {
      return { data: null, error: sanitizeError() };
    }

    return { data: { updated: true }, error: null };
  } catch {
    return { data: null, error: sanitizeError() };
  }
}

export async function authGetSession(): Promise<IAuthResult<{ session: IAuthSession | null }>> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { data: null, error: sanitizeError() };
    }

    return {
      data: {
        session: data.session as IAuthSession | null,
      },
      error: null,
    };
  } catch {
    return { data: null, error: sanitizeError() };
  }
}
