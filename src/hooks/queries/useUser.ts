import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

type QueryOptions = {
    enabled?: boolean;
    refetchInterval?: number;
};

export const useUser = (token: string | null, options?: QueryOptions) => {
    return useQuery({
        queryKey: ['user', token],
        queryFn: () => apiClient.get('/api/users/me', token),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: options?.refetchInterval ?? 30000
    });
};
