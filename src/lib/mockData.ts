import { NewsPost, ChatConversation, ChatMessage } from '../types';

export const MOCK_NEWS: NewsPost[] = [
    {
        id: 1,
        tenant_id: 1,
        created_by_id: 1,
        title: "Willkommen in unserer neuen App!",
        content: "Wir freuen uns, Ihnen unsere neue PfotenCard App vorstellen zu dürfen. Hier finden Sie alle Informationen rund um Ihre Termine, Neuigkeiten und können direkt mit uns chatten.",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        author_name: "Anna Admin"
    },
    {
        id: 2,
        tenant_id: 1,
        created_by_id: 1,
        title: "Sommerfest am nächsten Samstag",
        content: "Verpassen Sie nicht unser jährlich Sommerfest! Es gibt viele Aktivitäten für Mensch und Hund. Wir freuen uns auf Ihr Kommen!",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        author_name: "Mika Mitarbeiter"
    },
    {
        id: 3,
        tenant_id: 1,
        created_by_id: 1,
        title: "Änderung der Trainingszeiten",
        content: "Ab nächster Woche beginnen die Abendkurse bereits um 18:00 Uhr statt um 18:30 Uhr. Bitte beachten Sie dies bei Ihrer Planung.",
        created_at: new Date().toISOString(),
        author_name: "Anna Admin"
    }
];

// --- CUSTOMER PERSPECTIVE ---
export const MOCK_CONVERSATIONS_CUSTOMER: ChatConversation[] = [
    {
        user: { id: 'staff-1', name: 'Anna Admin', email: 'admin@hundeschule.de', role: 'admin', createdAt: new Date() },
        last_message: { id: 10, tenant_id: 1, sender_id: 1, receiver_id: 999, content: "Alles klar, bis dann!", is_read: true, created_at: new Date().toISOString() },
        unread_count: 0
    },
    {
        user: { id: 'staff-2', name: 'Mika Mitarbeiter', email: 'mika@hundeschule.de', role: 'mitarbeiter', createdAt: new Date() },
        last_message: { id: 20, tenant_id: 1, sender_id: 2, receiver_id: 999, content: "Haben Sie noch Fragen zum Kurs?", is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
        unread_count: 1
    }
];

export const MOCK_MESSAGES_CUSTOMER: Record<string, ChatMessage[]> = {
    'staff-1': [
        { id: 1, tenant_id: 1, sender_id: 999, receiver_id: 1, content: "Hallo Anna, ich habe eine Frage zum Training.", is_read: true, created_at: new Date(Date.now() - 18000000).toISOString() },
        { id: 2, tenant_id: 1, sender_id: 1, receiver_id: 999, content: "Hallo! Schieß los, wie kann ich helfen?", is_read: true, created_at: new Date(Date.now() - 16200000).toISOString() },
        { id: 10, tenant_id: 1, sender_id: 1, receiver_id: 999, content: "Alles klar, bis dann!", is_read: true, created_at: new Date().toISOString() }
    ],
    'staff-2': [
        { id: 11, tenant_id: 1, sender_id: 2, receiver_id: 999, content: "Guten Tag! Ich wollte mich erkundigen, ob mit Bello alles okay ist?", is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 20, tenant_id: 1, sender_id: 2, receiver_id: 999, content: "Haben Sie noch Fragen zum Kurs?", is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() }
    ]
};

// --- ADMIN PERSPECTIVE ---
export const MOCK_CONVERSATIONS_ADMIN: ChatConversation[] = [
    {
        user: { id: '999', name: 'Max Mustermann', email: 'max@beispiel.de', role: 'customer', createdAt: new Date() },
        last_message: { id: 30, tenant_id: 1, sender_id: 999, receiver_id: 888, content: "Das Training heute war super!", is_read: false, created_at: new Date().toISOString() },
        unread_count: 1
    },
    {
        user: { id: 'cust-2', name: 'Erika Elster', email: 'erika@beispiel.de', role: 'customer', createdAt: new Date() },
        last_message: { id: 40, tenant_id: 1, sender_id: 888, receiver_id: 200, content: "Die Rechnung wurde versendet.", is_read: true, created_at: new Date(Date.now() - 7200000).toISOString() },
        unread_count: 0
    }
];

export const MOCK_MESSAGES_ADMIN: Record<string, ChatMessage[]> = {
    '999': [
        { id: 30, tenant_id: 1, sender_id: 999, receiver_id: 888, content: "Das Training heute war super!", is_read: false, created_at: new Date().toISOString() }
    ],
    'cust-2': [
        { id: 40, tenant_id: 1, sender_id: 888, receiver_id: 200, content: "Die Rechnung wurde versendet.", is_read: true, created_at: new Date(Date.now() - 7200000).toISOString() }
    ]
};
