import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useUser = (token: string | null, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['user', token],
        queryFn: () => apiClient.get('/api/users/me', token),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: 30000
    });
};
