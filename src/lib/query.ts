import { QueryClient } from '@tanstack/react-query';
import type { AppError } from '@/lib/error';

// Make AppError the default TError for all queries and mutations so that
// onError callbacks are typed as (error: AppError) => void automatically.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  },
});
