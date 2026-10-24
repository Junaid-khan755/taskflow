import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ApiError } from './lib/api';
import { meKey } from './lib/auth';
import { toast } from './lib/toast';
import './index.css';

// If the session expires mid-use, any request gets a 401. Marking the user
// as logged out makes the protected pages redirect to /login.
function handleUnauthorized(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(meKey, null);
    return true;
  }
  return false;
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  // Any failed save (create, edit, move, delete) shows an error toast,
  // so individual components don't each need error handling.
  mutationCache: new MutationCache({
    onError: (error, _vars, _context, mutation) => {
      if (mutation.meta?.silent) return;
      if (handleUnauthorized(error)) return toast('Your session expired. Please log in again.');
      toast(error.message);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // Retrying won't fix "not logged in" or "not found"
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
