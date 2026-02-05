import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useAppointments = (
    token: string | null,
    startDate?: string,
    endDate?: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: ['appointments', token, startDate || 'all', endDate || 'all'],
        queryFn: () => apiClient.getAppointments(token, startDate, endDate),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: 30000
    });
};
