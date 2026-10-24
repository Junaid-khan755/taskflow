import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { PasswordInput } from '../components/PasswordInput';
import { useMe, useRegister } from '../lib/auth';
import { safeNextPath } from '../lib/safe-redirect';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  // Where to go after signing up, e.g. the board they tried to open
  const next = safeNextPath(searchParams.get('next'));

  const me = useMe();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Stops a double-click from sending two requests (see LoginPage)
  const submitting = useRef(false);

  if (me.isPending) {
    return <p className="p-8 text-slate-400">Loading...</p>;
  }
  if (me.data) {
    return <Navigate to={next} replace />;
  }

  // Hide the old error as soon as they start fixing the form
  function clearError() {
    if (register.error) {
      register.reset();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    register.mutate(
      { name, email, password },
      {
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  }

  const loginLink = next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <title>Sign up · TaskFlow</title>

      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">Create your account</h1>
        <p className="mb-6 text-sm text-slate-400">Start organising your team’s work.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="label">
              Name
            </label>
            <input
              id="name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError();
              }}
              className="input"
            />
          </div>

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
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(value) => {
                setPassword(value);
                clearError();
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              At least 8 characters. Avoid common ones like “12345678”.
            </p>
          </div>

          {register.error && (
            <p role="alert" className="text-sm text-red-400">
              {register.error.message}
            </p>
          )}

          <button type="submit" disabled={register.isPending} className="btn-primary py-2">
            {register.isPending ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to={loginLink} className="text-indigo-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
