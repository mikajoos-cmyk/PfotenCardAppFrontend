import { Level, Customer, User, Transaction } from '../types';

// --- MOCK DATEN ---
export const VIP_LEVEL: Level = { id: 99, name: 'VIP-Kunde', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/VIP.png' };
export const EXPERT_LEVEL: Level = { id: 100, name: 'Experte', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/09/DZKB-Experte.png' };

export const LEVELS: Level[] = [
    { id: 1, name: 'Welpen', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L1.png' },
    { id: 2, name: 'Grundlagen', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L2.png' },
    { id: 3, name: 'Fortgeschrittene', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L3.png' },
    { id: 4, name: 'Masterclass', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L4.png' },
    { id: 5, name: 'Hundeführerschein', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L5.png' },
];

// --- LOGIK & KONSTANTEN ---
export const LEVEL_REQUIREMENTS: { [key: number]: { id: string; name: string; required: number }[] } = {
    //   1: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    2: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    3: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    4: [{ id: 'social_walk', name: 'Social Walk', required: 6 }, { id: 'tavern_training', name: 'Wirtshaustraining', required: 2 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    5: [{ id: 'exam', name: 'Prüfung', required: 1 }],
};

export const DOGLICENSE_PREREQS = [
    { id: 'lecture_bonding', name: 'Vortrag Bindung & Beziehung', required: 1 },
    { id: 'lecture_hunting', name: 'Vortrag Jagdverhalten', required: 1 },
    { id: 'ws_communication', name: 'WS Kommunikation & Körpersprache', required: 1 },
    { id: 'ws_stress', name: 'WS Stress & Impulskontrolle', required: 1 },
    { id: 'theory_license', name: 'Theorieabend Hundeführerschein', required: 1 },
    { id: 'first_aid', name: 'Erste-Hilfe-Kurs', required: 1 },
];

export const CUSTOMERS: Customer[] = [
    {
        id: 'cust-anna',
        name: 'Anna-Maria Schoss',
        firstName: 'Anna-Maria',
        lastName: 'Schoss',
        dogName: 'Banu',
        dogs: [{ name: 'Banu' }],
        balance: 229.00,
        levelId: 1,
        level_id: 1,
        createdBy: 'user-admin-1',
        createdAt: new Date('2025-02-09'),
        customer_since: new Date('2025-02-09'),
        isVip: false,
        isExpert: false,
        levelUpHistory: {},
        email: 'anna.schoss@email.de',
        phone: '+49 123 456789',
        chip: '987000012345678'
    },
    // ... simplified mocks if needed, mainly backend is used now
];

export const INITIAL_USERS: User[] = [
    { id: 'user-admin-1', name: 'Christian Christian', email: 'christian@dogslife.de', role: 'admin', createdAt: new Date('2025-08-12') },
    // ...
];

export const TRANSACTIONS: Transaction[] = []; // Mock data mostly replaced by backend
