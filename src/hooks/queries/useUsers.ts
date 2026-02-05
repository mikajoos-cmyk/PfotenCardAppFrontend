import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

type QueryOptions = {
    enabled?: boolean;
    refetchInterval?: number;
};

export const useUsers = (token: string | null, options?: QueryOptions) => {
    return useQuery({
        queryKey: ['users', token],
        queryFn: () => apiClient.getUsers(token),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: options?.refetchInterval ?? 30000
    });
};
