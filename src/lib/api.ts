
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const apiClient = {
    get: async (path: string, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
        return response.json();
    },
    post: async (path: string, data: any, token: string | null) => {
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },
    put: async (path: string, data: any, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },
    setVipStatus: async (userId: string, isVip: boolean, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        return apiClient.put(`/api/users/${userId}/vip`, { is_vip: isVip }, token);
    },
    setExpertStatus: async (userId: string, isExpert: boolean, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        return apiClient.put(`/api/users/${userId}/expert`, { is_expert: isExpert }, token);
    },
    delete: async (path: string, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed`);
        }
        return response.json();
    },
    upload: async (path: string, file: File, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const formData = new FormData();
        formData.append("upload_file", file);

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // KEIN Content-Type, Browser setzt ihn
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `File upload failed`);
        }
        return response.json();
    },
};

export { API_BASE_URL }; // Exporting in case it's needed elsewhere
