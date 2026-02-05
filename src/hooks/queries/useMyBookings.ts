import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useMyBookings = (token: string | null) => {
    return useQuery({
        queryKey: ['myBookings', token],
        queryFn: () => apiClient.getMyBookings(token),
        enabled: !!token,
    });
};
