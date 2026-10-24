import { Link, useRouteError } from 'react-router';

/**
 * Shown instead of a blank screen or a raw stack trace when something
 * crashes while a page is drawing.
 */
export function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <title>Something went wrong · TaskFlow</title>
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-slate-400">
          Sorry, this page couldn’t load. Try going back to your boards.
        </p>
        <Link to="/" reloadDocument className="btn-primary">
          Back to your boards
        </Link>
        {/* Developers see the details while working locally; users never do */}
        {import.meta.env.DEV && (
          <pre className="mt-6 overflow-auto rounded-md bg-slate-900 p-3 text-left text-xs text-red-300">
            {String(error)}
          </pre>
        )}
      </div>
    </div>
  );
}
