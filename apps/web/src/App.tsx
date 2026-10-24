import {
  createBrowserRouter,
  Link,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router';
import { Toaster } from './components/Toaster';
import { useLogout, useMe } from './lib/auth';
import { AuthPage } from './pages/AuthPage';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';

function Header() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-4 border-b border-slate-800 px-4 py-3 sm:px-6">
      <Link to="/" className="text-lg font-bold tracking-tight">
        Task<span className="text-indigo-400">Flow</span>
      </Link>
      {me && (
        <>
          <span className="ml-auto hidden text-sm text-slate-400 sm:inline">{me.name}</span>
          <button
            // Go to a plain /login: "?next=" the old page would send whoever
            // logs in next to the previous user's board
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
            className="btn-ghost ml-auto sm:ml-0"
          >
            Log out
          </button>
        </>
      )}
    </header>
  );
}

function Layout() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

/** Pages inside this need a logged-in user; others are sent to /login. */
function RequireAuth() {
  const { data: me, isPending } = useMe();
  const location = useLocation();

  if (isPending) return <p className="p-8 text-slate-400">Loading...</p>;
  if (!me) {
    // Remember where they were going, so login can send them back there
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="p-8">
      <p className="text-slate-400">Page not found.</p>
      <Link to="/" className="mt-2 inline-block text-indigo-400 hover:underline">
        ← Back to all boards
      </Link>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: 'login', element: <AuthPage mode="login" /> },
      { path: 'register', element: <AuthPage mode="register" /> },
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'boards/:boardId', element: <BoardPage /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
