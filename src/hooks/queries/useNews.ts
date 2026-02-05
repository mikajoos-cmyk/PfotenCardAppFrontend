import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useNews = (token: string | null, options?: { refetchInterval?: number }) => {
    return useQuery({
        queryKey: ['news', token],
        queryFn: () => apiClient.getNews(token),
        enabled: !!token,
        refetchInterval: options?.refetchInterval, // Diese Zeile ist wichtig!
    });
};