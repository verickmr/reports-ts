import { useQuery } from '@tanstack/react-query';
import { fetchSession, sessionQueryKey } from './auth.api';

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    retry: false,
  });
}
