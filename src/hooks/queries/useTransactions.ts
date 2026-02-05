import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useTransactions = (
    token: string | null,
    userId?: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: ['transactions', token, userId || 'all'],
        queryFn: () => apiClient.getTransactions(token, userId),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: 30000
    });
};
