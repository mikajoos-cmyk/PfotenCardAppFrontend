// src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Hilfsfunktion: Ermittelt die Subdomain aus der aktuellen URL
const getSubdomain = () => {
    const hostname = window.location.hostname;

    // Für lokale Tests (localhost):
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null; // Oder 'bello' zum Testen
    }

    // Für Produktion (z.B. bello.pfotencard.de)
    const parts = hostname.split('.');

    // Ignoriere 'www' am Anfang, falls vorhanden
    if (parts[0] === 'www' && parts.length >= 4) {
        return parts[1];
    }

    if (parts.length >= 3) {
        return parts[0];
    }
    return null;
};

// Generiert die Header für jede Anfrage
const getHeaders = (token: string | null = null, hasBody: boolean = false) => {
    const headers: any = {};

    if (hasBody) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const subdomain = getSubdomain();
    if (subdomain) {
        headers['x-tenant-subdomain'] = subdomain;
    }

    return headers;
};

// Zentrale Response-Behandlung für 401/Fehler-Routing
async function handleResponse(response: Response) {
    if (response.status === 401) {
        // Falls wir nicht im Fehler-Handling-Loop landen wollen, prüfen wir kurz
        // Aber generell: 401 heißt RAUS.
        window.dispatchEvent(new Event('auth-unauthorized'));
        const errorText = await response.text().catch(() => "Unauthorized");
        throw new Error(`Session expired: ${errorText}`);
    }

    if (!response.ok) {
        // --- ÄNDERUNG HIER ---
        // Wir versuchen, den Body zu lesen, auch wenn es ein Fehler ist.
        const errorBody = await response.text().catch(() => null);

        // Wenn es ein 402 Fehler ist (Abo abgelaufen), werfen wir den Body als Error-Message,
        // damit wir ihn im AuthScreen parsen können.
        if (response.status === 402 && errorBody) {
            throw new Error(errorBody);
        }

        if (response.status === 404) {
            console.warn("API 404: Ressource oder Tenant nicht gefunden.");
        }

        throw new Error(errorBody || `API Fehler (${response.status}): ${response.statusText}`);
    }

    // 204 No Content handling
    if (response.status === 204) return null;

    return response.json();
}

export const apiClient = {
    get: async (path: string, token: string | null) => {
        console.log(`API GET: ${API_BASE_URL}${path} (Subdomain: ${getSubdomain()})`);

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'GET',
            headers: getHeaders(token),
        });

        return handleResponse(response);
    },

    post: async (path: string, data: any, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: getHeaders(token, true),
            body: JSON.stringify(data),
        });

        return handleResponse(response);
    },

    put: async (path: string, data: any, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            headers: getHeaders(token, true),
            body: JSON.stringify(data),
        });

        return handleResponse(response);
    },

    setVipStatus: async (userId: string, isVip: boolean, token: string | null) => {
        return apiClient.put(`/api/users/${userId}/vip`, { is_vip: isVip }, token);
    },

    setExpertStatus: async (userId: string, isExpert: boolean, token: string | null) => {
        return apiClient.put(`/api/users/${userId}/expert`, { is_expert: isExpert }, token);
    },

    delete: async (path: string, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'DELETE',
            headers: getHeaders(token),
        });

        return handleResponse(response);
    },

    updateAppointment: async (appointmentId: number, data: any, token: string | null) => {
        return apiClient.put(`/api/appointments/${appointmentId}`, data, token);
    },

    upload: async (path: string, file: File, token: string | null) => {
        const formData = new FormData();
        formData.append("upload_file", file);

        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const subdomain = getSubdomain();
        if (subdomain) headers['x-tenant-subdomain'] = subdomain;

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: headers,
            body: formData,
        });

        return handleResponse(response);
    },

    uploadDocuments: async (userId: string, formData: FormData, token: string | null) => {
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const subdomain = getSubdomain();
        if (subdomain) headers['x-tenant-subdomain'] = subdomain;

        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/documents`, {
            method: 'POST',
            headers: headers, // FormData sets Content-Type boundary automatically
            body: formData,
        });

        return handleResponse(response);
    },

    // NEU: Konfiguration laden (öffentlich, ohne Token)
    getConfig: async () => {
        const subdomain = getSubdomain();
        const headers: any = { 'Content-Type': 'application/json' };
        if (subdomain) {
            headers['x-tenant-subdomain'] = subdomain;
        }

        const response = await fetch(`${API_BASE_URL}/api/config`, {
            method: 'GET',
            headers: headers,
        });

        return handleResponse(response);
    },

    // --- USERS ---
    getUsers: async (token: string | null) => {
        return apiClient.get('/api/users', token);
    },

    getStaff: async (token: string | null) => {
        return apiClient.get('/api/users/staff', token);
    },

    // Update: user_id Parameter hinzugefügt
    getTransactions: async (token: string | null, userId?: string) => {
        const query = userId ? `?user_id=${userId}` : '';
        return apiClient.get(`/api/transactions${query}`, token);
    },

    // --- APPOINTMENTS ---
    getAppointments: async (token: string | null) => {
        return apiClient.get('/api/appointments', token);
    },

    getMyBookings: async (token: string | null) => {
        return apiClient.get('/api/users/me/bookings', token);
    },

    createAppointment: async (data: any, token: string | null) => {
        return apiClient.post('/api/appointments', data, token);
    },

    bookAppointment: async (appointmentId: number, token: string | null) => {
        return apiClient.post(`/api/appointments/${appointmentId}/book`, {}, token);
    },

    cancelAppointment: async (appointmentId: number, token: string | null) => {
        return apiClient.delete(`/api/appointments/${appointmentId}/book`, token);
    },

    getParticipants: async (appointmentId: number, token: string | null) => {
        return apiClient.get(`/api/appointments/${appointmentId}/participants`, token);
    },

    toggleAttendance: async (bookingId: number, token: string | null) => {
        return apiClient.put(`/api/bookings/${bookingId}/attendance`, {}, token);
    },

    // --- NEWS ---
    getNews: async (token: string | null) => {
        return apiClient.get('/api/news', token);
    },

    createNews: async (data: {
        title: string;
        content: string;
        image_url?: string;
        target_level_ids?: number[];
        target_appointment_ids?: number[];
    }, token: string | null) => {
        return apiClient.post('/api/news', data, token);
    },

    updateNews: async (postId: number, data: {
        title?: string;
        content?: string;
        image_url?: string;
        target_level_ids?: number[];
        target_appointment_ids?: number[];
    }, token: string | null) => {
        return apiClient.put(`/api/news/${postId}`, data, token);
    },

    deleteNews: async (postId: number, token: string | null) => {
        return apiClient.delete(`/api/news/${postId}`, token);
    },

    // --- CHAT ---
    sendChatMessage: async (data: {
        content: string;
        receiver_id: number;
        file_url?: string;
        file_type?: string;
        file_name?: string;
    }, token: string | null) => {
        return apiClient.post('/api/chat', data, token);
    },

    getConversations: async (token: string | null) => {
        return apiClient.get('/api/chat/conversations', token);
    },

    getChatMessages: async (otherUserId: number, token: string | null) => {
        return apiClient.get(`/api/chat/${otherUserId}`, token);
    },

    markChatRead: async (otherUserId: number, token: string | null) => {
        return apiClient.post(`/api/chat/${otherUserId}/read`, {}, token);
    },

    // --- APP STATUS ---
    getAppStatus: async (token: string | null) => {
        return apiClient.get('/api/status', token);
    },

    updateAppStatus: async (data: { status: string, message: string }, token: string | null) => {
        return apiClient.put('/api/status', data, token);
    }
};

export interface Appointment {
    id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    max_participants: number;
    participants_count?: number;
    trainer_id?: number;
    target_level_ids?: number[];
    trainer?: any;
    target_levels?: any[];
    created_at: string;
}

export interface Booking {
    id: number;
    appointment_id: number;
    user_id: number;
    status: string;
    attended: boolean;
    user?: any; // User object embedded
    created_at: string;
}


export { API_BASE_URL };
