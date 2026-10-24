import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { toast } from './lib/toast';
import './index.css';

const queryClient = new QueryClient({
  // Any failed save (create, edit, move, delete) shows an error toast,
  // so individual components don't each need error handling.
  mutationCache: new MutationCache({ onError: (error) => toast(error.message) }),
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
