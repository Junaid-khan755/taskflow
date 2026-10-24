import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { PasswordInput } from '../components/PasswordInput';
import { useLogin, useMe } from '../lib/auth';
import { safeNextPath } from '../lib/safe-redirect';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  // Where to go after logging in, e.g. the board they tried to open
  const next = safeNextPath(searchParams.get('next'));

  const me = useMe();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Stops a double-click from sending two requests. A ref changes instantly,
  // while login.isPending only changes after React re-renders.
  const submitting = useRef(false);

  // Still checking whether they're logged in. Don't show the form yet, or
  // someone who's already logged in would see it flash before the redirect.
  if (me.isPending) {
    return <p className="p-8 text-slate-400">Loading...</p>;
  }
  if (me.data) {
    return <Navigate to={next} replace />;
  }

  // Hide the old error as soon as they start fixing the form
  function clearError() {
    if (login.error) {
      login.reset();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    login.mutate(
      { email, password },
      {
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  }

  const registerLink = next === '/' ? '/register' : `/register?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      {/* React 19 moves this into the page's <head>: it sets the browser tab text */}
      <title>Log in · TaskFlow</title>

      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-400">Log in to see your boards.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                clearError();
              }}
            />
          </div>

          {login.error && (
            <p role="alert" className="text-sm text-red-400">
              {login.error.message}
            </p>
          )}

          <button type="submit" disabled={login.isPending} className="btn-primary py-2">
            {login.isPending ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Only in `npm run dev`; Vite removes this from production builds */}
        {import.meta.env.DEV && (
          <p className="mt-6 rounded-md border border-slate-800 p-3 text-xs text-slate-400">
            Demo logins (from <code>npm run db:seed</code>): <b>alice@example.com</b> (owner) or{' '}
            <b>bob@example.com</b> (member), password <b>password123</b>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to={registerLink} className="text-indigo-400 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
