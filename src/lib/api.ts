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

export const apiClient = {
    get: async (path: string, token: string | null) => {
        console.log(`API GET: ${API_BASE_URL}${path} (Subdomain: ${getSubdomain()})`);
        
        try {
            const response = await fetch(`${API_BASE_URL}${path}`, {
                method: 'GET',
                headers: getHeaders(token),
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                   console.warn("API 404: Ressource oder Tenant nicht gefunden.");
                }
                const errorText = await response.text();
                throw new Error(`API Fehler (${response.status}): ${errorText || response.statusText}`);
            }
            return response.json();
        } catch (err) {
            console.error("Netzwerkfehler oder falsche API URL:", err);
            throw err;
        }
    },

    post: async (path: string, data: any, token: string | null) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: getHeaders(token, true),
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
