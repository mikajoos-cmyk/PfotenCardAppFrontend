import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

type QueryOptions = {
    enabled?: boolean;
    refetchInterval?: number;
};

export const useTransactions = (
    token: string | null,
    userId?: string,
    options?: QueryOptions
) => {
    return useQuery({
        queryKey: ['transactions', token, userId || 'all'],
        queryFn: () => apiClient.getTransactions(token, userId),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: options?.refetchInterval ?? 30000
    });
};
