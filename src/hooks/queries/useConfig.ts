import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useConfig = () => {
    return useQuery({
        queryKey: ['config'],
        queryFn: () => apiClient.getConfig(),
        staleTime: 1000 * 60 * 60, // Config ändert sich selten -> 1 Stunde im Cache lassen
    });
};
