import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router';
import { Toaster } from './components/Toaster';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';

function Layout() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center border-b border-slate-800 px-4 py-3 sm:px-6">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Task<span className="text-indigo-400">Flow</span>
        </Link>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
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
      { index: true, element: <HomePage /> },
      { path: 'boards/:boardId', element: <BoardPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
