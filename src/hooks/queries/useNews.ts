import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useNews = (token: string | null) => {
    return useQuery({
        queryKey: ['news', token],
        queryFn: () => apiClient.getNews(token),
        enabled: !!token,
    });
};
