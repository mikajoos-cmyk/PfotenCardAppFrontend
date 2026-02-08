import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export const useChatMessages = (partnerIdentifier: string | number | null, token: string | null) => {
    return useQuery({
        queryKey: ['chatMessages', partnerIdentifier, token], // Eigener Cache für jeden Partner
        queryFn: () => apiClient.getChatMessages(partnerIdentifier as any, token),
        enabled: !!partnerIdentifier && !!token, // Nur laden, wenn ein Partner ausgewählt ist
        refetchInterval: 3000, // Alle 3 Sekunden auf neue Nachrichten prüfen
    });
};