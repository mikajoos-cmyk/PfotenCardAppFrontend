import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useStaff = (token: string | null) => {
    return useQuery({
        queryKey: ['staff', token],
        queryFn: () => apiClient.getStaff(token),
        enabled: !!token,
    });
};
