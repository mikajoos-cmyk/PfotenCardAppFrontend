import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useChatMessages = (partnerId: number | null, token: string | null) => {
    return useQuery({
        queryKey: ['chatMessages', partnerId, token], // Eigener Cache für jeden Partner
        queryFn: () => apiClient.getChatMessages(partnerId, token),
        enabled: !!partnerId && !!token, // Nur laden, wenn ein Partner ausgewählt ist
        refetchInterval: 3000, // Alle 3 Sekunden auf neue Nachrichten prüfen
    });
};