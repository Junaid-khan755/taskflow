import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useLogin, useMe, useRegister } from '../lib/auth';

/** Login and sign-up share one page; `mode` picks which form to show. */
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  const [params] = useSearchParams();
  // Only allow internal paths, so a link like /login?next=https://evil.com
  // can't send users to another site after they log in (an "open redirect")
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/';

  const me = useMe();
  const login = useLogin();
  const register = useRegister();
  const mutation = isLogin ? login : register;
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (me.data) return <Navigate to={next} replace />;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mb-6 text-sm text-slate-400">
          {isLogin ? 'Log in to see your boards.' : 'Start organising your team’s work.'}
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isLogin) login.mutate({ email: form.email, password: form.password });
            else register.mutate(form);
          }}
        >
          {!isLogin && (
            <div>
              <label htmlFor="name" className="label">
                Name
              </label>
              <input
                id="name"
                required
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                className="input"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={isLogin ? undefined : 8}
              // Lets password managers fill or generate the right password
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={set('password')}
              className="input"
            />
            {!isLogin && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
          </div>

          {mutation.error && (
            <p role="alert" className="text-sm text-red-400">
              {mutation.error.message}
            </p>
          )}

          <button type="submit" disabled={mutation.isPending} className="btn-primary py-2">
            {mutation.isPending ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        {/* Only in `npm run dev`; Vite strips this from production builds */}
        {import.meta.env.DEV && isLogin && (
          <p className="mt-6 rounded-md border border-slate-800 p-3 text-xs text-slate-400">
            Demo logins (from <code>npm run db:seed</code>): <b>alice@example.com</b> (owner) or{' '}
            <b>bob@example.com</b> (member), password <b>password123</b>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? 'New here? ' : 'Already have an account? '}
          <Link
            to={`${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-indigo-400 hover:underline"
          >
            {isLogin ? 'Create an account' : 'Log in'}
          </Link>
        </p>
      </div>
    </div>
  );
}
