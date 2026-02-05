import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useUsers = (token: string | null, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['users', token],
        queryFn: () => apiClient.getUsers(token),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: 30000
    });
};
