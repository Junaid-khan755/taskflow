import { useEffect, useState } from 'react';

type Health = { status: string; database: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">TaskFlow</h1>
        <p className="text-slate-400">Team task manager · PERN + TypeScript</p>
        <div className="rounded-lg border border-slate-800 px-6 py-4 text-sm">
          {error && <span className="text-red-400">API unreachable</span>}
          {!error && !health && <span className="text-slate-400">Checking API...</span>}
          {health && (
            <span>
              API: <b className="text-emerald-400">{health.status}</b> · Database:{' '}
              <b className={health.database === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                {health.database}
              </b>
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
