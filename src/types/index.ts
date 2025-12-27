export type UserRole = 'admin' | 'mitarbeiter' | 'customer' | 'kunde';
export type Page = 'dashboard' | 'customers' | 'reports' | 'users' | 'appointments';
export type View = { page: Page; customerId?: string, subPage?: 'detail' | 'transactions' };

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    customerId?: string;
    createdAt: Date;
}

export interface Level {
    id: number;
    name: string;
    imageUrl: string;
}

export interface Customer {
    id: string;
    auth_id?: string;

    // Name handling
    name: string; // Primary display name
    firstName?: string;
    lastName?: string;

    // Balance
    balance: number;

    // Dog info
    dogName?: string; // Deprecated/Mock
    dogs: { name: string; breed?: string; birth_date?: string; chip?: string; id?: string }[];

    // Level info
    levelId?: number; // Mock
    level_id?: number; // Backend
    current_level_id?: number; // Backend Alias
    levelUpHistory?: { [key: number]: Date };

    // Meta
    createdBy?: string;
    createdAt?: Date | string;
    customer_since?: string | Date; // Backend

    // Status
    isVip?: boolean;
    is_vip?: boolean;
    isExpert?: boolean;
    is_expert?: boolean;

    // Contact
    email?: string;
    phone?: string;

    // Any other backend fields
    role?: UserRole;
    chip?: string;
    is_active?: boolean;
}

export interface Transaction {
    id: string;
    customerId: string; // or user_id in backend
    createdBy: string; // or booked_by_id in backend
    type: 'topup' | 'bonus' | 'debit' | 'event' | string; // backend uses 'Aufladung' etc.
    title: string; // or description
    amount: number;
    createdAt: Date; // or date
    meta?: { requirementId?: string; };

    // Backend fields match found in code
    user_id?: string;
    booked_by_id?: string;
    description?: string;
    date?: string | Date;
    bonus?: number; // NEU
}

export interface DocumentFile {
    id: string;
    customerId: string;
    file?: File; // For upload
    name: string; // or file_name
    type: string; // or file_type
    size: number;
    url: string;

    // Backend fields
    file_name?: string;
    file_type?: string;
}
