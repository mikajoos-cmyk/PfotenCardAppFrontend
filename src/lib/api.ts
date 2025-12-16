const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Helper function to extract subdomain from current URL
const getSubdomain = () => {
    const hostname = window.location.hostname;
    // For localhost/dev, you might want to return a hardcoded test value or null
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return null; // Or return 'bello' for testing if you have a tenant 'bello'
    }
    const parts = hostname.split('.');
    if (parts.length >= 3) {
        return parts[0];
    }
    return null;
};

export const apiClient = {
    get: async (path: string, token: string | null) => {
        // Allow calls without token (e.g. config), but require it for others
        const headers: any = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // --- FIX: Add Tenant Header ---
        const subdomain = getSubdomain();
        if (subdomain) {
            headers['x-tenant-subdomain'] = subdomain;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'GET',
            headers: headers,
        });
        
        if (!response.ok) {
            // Handle 404 specifically for Tenant/User not found
            if (response.status === 404) {
               console.warn("Resource or Tenant not found (404)");
            }
            throw new Error(`API request failed: ${response.statusText}`);
        }
        return response.json();
    },

    post: async (path: string, data: any, token: string | null) => {
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // --- FIX: Add Tenant Header ---
        const subdomain = getSubdomain();
        if (subdomain) {
            headers['x-tenant-subdomain'] = subdomain;
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
        
        const headers: any = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        // --- FIX: Add Tenant Header ---
        const subdomain = getSubdomain();
        if (subdomain) {
            headers['x-tenant-subdomain'] = subdomain;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },

    // ... (Add the header logic to setVipStatus, setExpertStatus, delete, upload as well) ...
    
    setVipStatus: async (userId: string, isVip: boolean, token: string | null) => {
        // Re-use the put method above which now has the header logic
        return apiClient.put(`/api/users/${userId}/vip`, { is_vip: isVip }, token);
    },
    
    setExpertStatus: async (userId: string, isExpert: boolean, token: string | null) => {
        return apiClient.put(`/api/users/${userId}/expert`, { is_expert: isExpert }, token);
    },

    delete: async (path: string, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        
        const headers: any = {
            'Authorization': `Bearer ${token}`,
        };
        const subdomain = getSubdomain();
        if (subdomain) headers['x-tenant-subdomain'] = subdomain;

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'DELETE',
            headers: headers,
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

        const headers: any = { 'Authorization': `Bearer ${token}` };
        const subdomain = getSubdomain();
        if (subdomain) headers['x-tenant-subdomain'] = subdomain;

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: headers, 
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `File upload failed`);
        }
        return response.json();
    },
};

export { API_BASE_URL };
