export interface IAuthUser {
  id: string;
  email: string;
}

export interface IAuthSession {
  access_token: string;
  refresh_token: string;
  user: IAuthUser;
}

export interface IAuthState {
  user: IAuthUser | null;
  session: IAuthSession | null;
  loading: boolean;
}

export interface IAuthError {
  message: string;
}

export interface ISignUpCredentials {
  email: string;
  password: string;
}

export interface ISignInCredentials {
  email: string;
  password: string;
}
