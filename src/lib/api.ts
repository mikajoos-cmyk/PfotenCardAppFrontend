// src/lib/api.ts

// Die Basis-URL deines Backends (z.B. https://pfotencardbackendmultipletenants.onrender.com oder https://api.pfotencard.de)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Hilfsfunktion: Ermittelt die Subdomain aus der aktuellen URL
const getSubdomain = () => {
    const hostname = window.location.hostname;

    // Für lokale Tests (localhost):
    // Hier kannst du 'bello' oder eine andere Test-Subdomain festlegen
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        // HINWEIS: Ändere dies zum Testen lokal auf den Namen eines existierenden Tenants!
        // return 'bello'; 
        return null; 
    }

    // Für Produktion (z.B. bello.pfotencard.de)
    const parts = hostname.split('.');
    // Wir erwarten mindestens: subdomain.domain.tld (3 Teile)
    if (parts.length >= 3) {
        return parts[0]; // Gibt 'bello' zurück
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

    // --- WICHTIG: Hier wird die Subdomain angehängt ---
    const subdomain = getSubdomain();
    if (subdomain) {
        headers['x-tenant-subdomain'] = subdomain;
    }

    return headers;
};

export const apiClient = {
    get: async (path: string, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'GET',
            headers: getHeaders(token),
        });
        
        if (!response.ok) {
            // Spezielle Behandlung für 404 (Tenant nicht gefunden)
            if (response.status === 404) {
               console.warn("Ressource oder Hundeschule nicht gefunden (404). Subdomain:", getSubdomain());
            }
            throw new Error(`API request failed: ${response.statusText} (${response.status})`);
        }
        return response.json();
    },

    post: async (path: string, data: any, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: getHeaders(token, true), // true = hat Body
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },

    put: async (path: string, data: any, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            headers: getHeaders(token, true),
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },
    
    // Wrapper-Methoden für spezifische Funktionen
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
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API request failed`);
        }
        return response.json();
    },

    upload: async (path: string, file: File, token: string | null) => {
        const formData = new FormData();
        formData.append("upload_file", file);

        // Header ohne Content-Type (macht der Browser bei FormData automatisch)
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const subdomain = getSubdomain();
        if (subdomain) headers['x-tenant-subdomain'] = subdomain;

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: headers, 
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `File upload failed`);
        }
        return response.json();
    },
};

export { API_BASE_URL };
