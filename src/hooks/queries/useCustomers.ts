import { useMemo } from 'react';
import { useUsers } from './useUsers';

export const useCustomers = (token: string | null, options?: { enabled?: boolean }) => {
    const usersQuery = useUsers(token, options);
    const customers = useMemo(() => {
        if (!usersQuery.data) return [];
        return usersQuery.data.filter((user: any) => user.role === 'customer' || user.role === 'kunde');
    }, [usersQuery.data]);

    return {
        ...usersQuery,
        data: customers
    };
};
