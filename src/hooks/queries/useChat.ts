import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useChat = (token: string | null) => {
    return useQuery({
        queryKey: ['chat', token],
        queryFn: () => apiClient.getConversations(token),
        enabled: !!token,
        refetchInterval: 5000, // WICHTIG: Alle 5 Sekunden prüfen!
    });
};