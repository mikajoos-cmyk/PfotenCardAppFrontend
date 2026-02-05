import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

type QueryOptions = {
    enabled?: boolean;
    refetchInterval?: number;
};

export const useAppointments = (
    token: string | null,
    startDate?: string,
    endDate?: string,
    options?: QueryOptions
) => {
    return useQuery({
        queryKey: ['appointments', token],
        queryFn: () => apiClient.getAppointments(token, startDate, endDate),
        enabled: !!token && (options?.enabled ?? true),
        refetchInterval: options?.refetchInterval ?? 30000
    });
};
