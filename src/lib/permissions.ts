
import { User } from '../types';

export const hasPermission = (user: User | any, permission: 'can_create_courses' | 'can_edit_status' | 'can_delete_customers' | 'can_create_messages'): boolean => {
    if (!user) return false;

    // Admins always have all permissions
    if (user.role === 'admin') return true;

    // Customers never have these permissions
    if (user.role === 'customer' || user.role === 'kunde') return false;

    // Mitarbeiter check
    if (user.role === 'mitarbeiter') {
        // If no permissions object exists, default to false for safety
        if (!user.permissions) return false;
        return !!user.permissions[permission];
    }

    return false;
};
