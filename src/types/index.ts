export type UserRole = 'admin' | 'mitarbeiter' | 'customer' | 'kunde';
export type Page = 'dashboard' | 'customers' | 'reports' | 'users' | 'appointments' | 'news' | 'chat' | 'transactions' | 'impressum' | 'datenschutz' | 'agb';
export type View = { page: Page; customerId?: string, chatPartnerId?: string, subPage?: 'detail' | 'transactions', targetAppointmentId?: number, dogId?: number };


export interface User {
    id: string;
    auth_id?: string;
    name: string;
    email: string;
    role: UserRole;
    customerId?: string;
    level_id?: number;
    current_level_id?: number;
    createdAt: Date;
    notifications_email?: boolean;
    notifications_push?: boolean;

    notif_email_overall?: boolean;
    notif_email_chat?: boolean;
    notif_email_news?: boolean;      // <--- Neu
    notif_email_booking?: boolean;
    notif_email_reminder?: boolean;  // <--- Neu
    notif_email_alert?: boolean;
    notif_email_system?: boolean;    // (Optional beibehalten falls noch genutzt)

    notif_push_overall?: boolean;
    notif_push_chat?: boolean;
    notif_push_news?: boolean;       // <--- Neu
    notif_push_booking?: boolean;
    notif_push_reminder?: boolean;   // <--- Neu
    notif_push_alert?: boolean;
    notif_push_system?: boolean;     // (Optional beibehalten falls noch genutzt)

    reminder_offset_minutes?: number; // <--- Neu
    permissions?: {
        can_create_courses: boolean;
        can_edit_status: boolean;
        can_delete_customers: boolean;
        can_create_messages: boolean;
    };
}

export interface ColorRule {
    id: string;
    name: string;
    type: 'level' | 'service';
    target_ids: number[];
    color: string;
    match_all?: boolean; // New logic: true = AND (all must match), false/undef = OR (any one is enough)
}

export interface Appointment {
    id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    max_participants: number;
}

export interface Level {
    id: number;
    name: string;
    imageUrl: string;
    color?: string;
    rank_order?: number;
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
    dogs: { name: string; breed?: string; birth_date?: string; chip?: string; id?: number }[];

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
    notifications_email?: boolean;
    notifications_push?: boolean;

    notif_email_overall?: boolean;
    notif_email_chat?: boolean;
    notif_email_news?: boolean;      // <--- Neu
    notif_email_booking?: boolean;
    notif_email_reminder?: boolean;  // <--- Neu
    notif_email_alert?: boolean;
    notif_email_system?: boolean;

    notif_push_overall?: boolean;
    notif_push_chat?: boolean;
    notif_push_news?: boolean;       // <--- Neu
    notif_push_booking?: boolean;
    notif_push_reminder?: boolean;   // <--- Neu
    notif_push_alert?: boolean;
    notif_push_system?: boolean;

    reminder_offset_minutes?: number; // <--- Neu
    permissions?: {
        can_create_courses: boolean;
        can_edit_status: boolean;
        can_delete_customers: boolean;
        can_create_messages: boolean;
    };
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
    dog_id?: number; // NEU
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

export interface NewsPost {
    id: number;
    tenant_id: number;
    created_by_id: number;
    title: string;
    content: string;
    image_url?: string;
    created_at: string; // ISO date string
    author_name?: string;
    target_level_ids?: number[];
    target_appointment_ids?: number[];

    // Optional expanded author
    author?: User;
}

export interface ChatMessage {
    id: number;
    tenant_id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
    file_url?: string;
    file_type?: string;
    file_name?: string;
}

export interface ChatConversation {
    user: User;
    last_message?: ChatMessage;
    unread_count: number;
}

export interface AppStatus {
    id: number;
    status: 'active' | 'cancelled' | 'partial';
    message: string | null;
    updated_at: string;
    levels?: Level[];
}
