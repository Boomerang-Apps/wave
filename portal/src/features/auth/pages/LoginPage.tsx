import { LoginForm } from '../components/LoginForm';

export function LoginPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
