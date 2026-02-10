import React, { FC, useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './lib/supabase';
import { apiClient, getSubdomain } from './lib/api';
import { User, View } from './types';

import './status-tabs.css';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import Icon from './components/ui/Icon';
import { isDarkColor, getAdjustedColor, getContrastColor } from './lib/utils';
import Sidebar from './components/layout/Sidebar';
import CustomerSidebar from './components/layout/CustomerSidebar';
import AuthScreen from './components/auth/AuthScreen';
import PasswordInput from './components/ui/PasswordInput';

// Modals
import InfoModal from './components/modals/InfoModal';
import AddCustomerModal from './components/modals/AddCustomerModal';
import UserFormModal from './components/modals/UserFormModal';
import DeleteUserModal from './components/modals/DeleteUserModal';
import DeleteDocumentModal from './components/modals/DeleteDocumentModal';
import DogFormModal from './components/modals/DogFormModal';
import DeleteDogModal from './components/modals/DeleteDogModal';
import NotificationSettingsModal from './components/modals/NotificationSettingsModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import TransactionManagementPage from './pages/customers/TransactionManagementPage';
import CustomerTransactionsPage from './pages/customers/CustomerTransactionsPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/admin/UsersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import { NewsPage } from './pages/NewsPage';
import { ChatPage } from './pages/ChatPage';

// NEU: Hook importieren
import { useVisualViewport } from './hooks/useVisualViewport';
import { useUser } from './hooks/queries/useUser';
import { useUsers } from './hooks/queries/useUsers';
import { useCustomers } from './hooks/queries/useCustomers';
import { useTransactions } from './hooks/queries/useTransactions';
import { hasPermission } from './lib/permissions';

// Legal Pages
import { ImpressumPage } from './pages/legal/ImpressumPage';
import { DatenschutzPage } from './pages/legal/DatenschutzPage';
import { AGBPage } from './pages/legal/AGBPage';
import { CookieBanner } from './components/ui/CookieBanner';
import { ContextHelp } from './components/ui/ContextHelp'; // Importieren
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';


const generateOpaqueIcon = (url: string, backgroundColor: string = '#FFFFFF'): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Hintergrund füllen
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Bild darüber zeichnen
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve(url);
            }
        };
        img.onerror = () => {
            console.warn('Konnte Icon für iOS nicht generieren, nutze Original.');
            resolve(url);
        };
    });
};


export const getFullImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    
    // Check if it is a Supabase public_uploads path
    if (url.startsWith("dogs/") || url.startsWith("news/") || url.startsWith("logos/")) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/public_uploads/${url}`;
        }
    }
    
    return `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${url}`;
};

// Configuration: Set to true to require login for viewing customer cards via QR code
const REQUIRE_AUTH_FOR_CUSTOMER_VIEW = false;

export default function App() {
    // NEU: Hook hier aufrufen, damit er global wirkt
    useVisualViewport();

    const queryClient = useQueryClient();
    const [loggedInUser, setLoggedInUser] = useState<any | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
    const isPreviewMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'preview', []);

    // ... (Restlicher Code bleibt unverändert bis zum Return) ...
    // Initial View basierend auf URL bestimmen
    const [view, setView] = useState<View>(() => {
        const path = window.location.pathname;

        if (path === '/update-password') {
            return { page: 'dashboard' }; // showPasswordReset state will handle rendering
        }

        const match = path.match(/^\/customer\/([a-zA-Z0-9-]+)$/);
        if (match && match[1]) {
            const identifier = match[1];
            // Only allow UUID access, reject numeric IDs
            const isUuid = identifier.includes('-');
            return { page: 'customers', subPage: 'detail', customerId: isUuid ? identifier : undefined };
        }

        if (path === '/news') return { page: 'news' };
        if (path === '/chat') return { page: 'chat' };
        const chatMatch = path.match(/^\/chat\/([a-zA-Z0-9-]+)$/);
        if (chatMatch && chatMatch[1]) {
            const identifier = chatMatch[1];
            // For chat, we also prefer UUID
            const isUuid = identifier.includes('-');
            return { page: 'chat', chatPartnerId: isUuid ? identifier : undefined };
        }
        if (path === '/appointments') return { page: 'appointments' };
        if (path === '/customers') return { page: 'customers' };
        if (path === '/users') return { page: 'users' };
        if (path === '/reports') return { page: 'reports' };
        if (path === '/transactions') return { page: 'transactions' };
        if (path === '/impressum') return { page: 'impressum' };
        if (path === '/datenschutz') return { page: 'datenschutz' };
        if (path === '/agb') return { page: 'agb' };

        return { page: 'dashboard' };

    });

    // --- ÄNDERUNG: Initialer Check beim App-Start ---
    // Dies stellt sicher, dass beim Neuladen der Seite ein evtl. erneuertes Token von Supabase übernommen wird
    useEffect(() => {
        const initSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session && data.session.access_token !== authToken) {
                console.log("Sitzung beim Start wiederhergestellt");
                localStorage.setItem('authToken', data.session.access_token);
                setAuthToken(data.session.access_token);
            }
        };
        initSession();

        // Popstate-Event für Browser-Navigation (Zurück/Vor)
        const handlePopState = () => {
            const path = window.location.pathname;
            let newView: View = { page: 'dashboard' };

            const match = path.match(/^\/customer\/([a-zA-Z0-9-]+)$/);
            if (match && match[1]) {
                const identifier = match[1];
                const isUuid = identifier.includes('-');
                newView = { page: 'customers', subPage: 'detail', customerId: isUuid ? identifier : undefined };
            } else if (path === '/news') newView = { page: 'news' };
            else if (path === '/chat') newView = { page: 'chat' };
            else if (path.startsWith('/chat/')) {
                const chatMatch = path.match(/^\/chat\/([a-zA-Z0-9-]+)$/);
                if (chatMatch && chatMatch[1]) {
                    const identifier = chatMatch[1];
                    const isUuid = identifier.includes('-');
                    newView = { page: 'chat', chatPartnerId: isUuid ? identifier : undefined };
                } else {
                    newView = { page: 'chat' };
                }
            }
            else if (path === '/appointments') newView = { page: 'appointments' };
            else if (path === '/customers') newView = { page: 'customers' };
            else if (path === '/users') newView = { page: 'users' };
            else if (path === '/reports') newView = { page: 'reports' };
            else if (path === '/transactions') newView = { page: 'transactions' };
            else if (path === '/impressum') newView = { page: 'impressum' };
            else if (path === '/datenschutz') newView = { page: 'datenschutz' };
            else if (path === '/agb') newView = { page: 'agb' };

            setView(newView);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // ... (Hier der ganze restliche State & Effects Code - UNVERÄNDERT) ...
    const shouldFetchData = !!authToken && !isPreviewMode;
    const userQuery = useUser(authToken, { enabled: shouldFetchData, refetchInterval: 30000 });
    const isCustomerRole = loggedInUser?.role === 'customer' || loggedInUser?.role === 'kunde';

    const usersQuery = useUsers(authToken, {
        enabled: shouldFetchData && !!loggedInUser && !isCustomerRole,
        refetchInterval: 30000
    });
    const customersQuery = useCustomers(authToken, {
        enabled: shouldFetchData && !!loggedInUser && !isCustomerRole,
        refetchInterval: 30000
    });
    const transactionsQuery = useTransactions(authToken, undefined, {
        enabled: shouldFetchData && !!loggedInUser,
        refetchInterval: 30000
    });

    const appStatusQuery = useQuery({
        queryKey: ['appStatus', authToken],
        queryFn: () => apiClient.getAppStatus(authToken),
        enabled: shouldFetchData,
        refetchInterval: 30000
    });

    const customers = isCustomerRole && loggedInUser ? [loggedInUser] : (customersQuery.data || []);
    const users = isCustomerRole && loggedInUser ? [loggedInUser] : (usersQuery.data || []);
    const transactions = transactionsQuery.data || [];
    const appStatus = appStatusQuery.data || null;
    const isAppLoading = shouldFetchData && userQuery.isLoading;

    useEffect(() => {
        if (isPreviewMode) return;
        setLoggedInUser(userQuery.data || null);
    }, [userQuery.data, isPreviewMode]);

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({ isOpen: false, title: '', content: null, color: 'green' });
    const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 992);

    // Modals State
    const [userModal, setUserModal] = useState<{ isOpen: boolean; user: any | null }>({ isOpen: false, user: null });
    const [deleteUserModal, setDeleteUserModal] = useState<any | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<any | null>(null);
    const [dogFormModal, setDogFormModal] = useState<{ isOpen: boolean; dog: any | null }>({ isOpen: false, dog: null });
    const [deletingDog, setDeletingDog] = useState<any | null>(null);
    const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);

    const [isServerLoading, setServerLoading] = useState<{ active: boolean; message: string }>({ active: false, message: '' });

    // NEU: State für Cookie-Consent (Initialwert direkt aus localStorage lesen)
    const [cookieConsent, setCookieConsent] = useState(!!localStorage.getItem('cookie-consent-seen'));

    const handleCookieAccept = () => {
        setCookieConsent(true);
    };

    // Removed customerPage state in favor of global View
    const [directAccessedCustomer, setDirectAccessedCustomer] = useState<any | null>(null);

    const [showPasswordReset, setShowPasswordReset] = useState(window.location.pathname === '/update-password');
    const [newPassword, setNewPassword] = useState('');

    // Config State
    const [schoolName, setSchoolName] = useState('PfotenCard');
    const [previewConfig, setPreviewConfig] = useState<{
        logoUrl?: string;
        viewMode: 'app' | 'login';
        levels?: any[];
        services?: any[];
        balance?: { allow_custom_top_up: boolean; top_up_options: { amount: number; bonus: number }[]; };
        activeModules?: string[];
        levelTerm?: string;
        vipTerm?: string;
    }>({
        viewMode: 'app',
        logoUrl: 'https://ctsoisfxbhaynonnudua.supabase.co/storage/v1/object/public/public_uploads/paw.png'
    });

    const [appConfigData, setAppConfigData] = useState<any>(null);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [hasNewNews, setHasNewNews] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(false);

    // Ref to prevent infinite logout loop
    const isLoggingOut = useRef(false);

    const togglePreviewRole = () => {
        if (!loggedInUser) return;
        const newRole = loggedInUser.role === 'admin' ? 'customer' : 'admin';
        const updatedUser = {
            ...loggedInUser,
            role: newRole,
            name: newRole === 'admin' ? 'Max Admin' : 'Max Mustermann'
        };
        setLoggedInUser(updatedUser);
        updateUsersCache(prev => prev.map((user: any) => user.id === loggedInUser.id ? updatedUser : user));
        handleSetView({ page: 'dashboard' });
    };

    // --- ZENTRALE THEME ENGINE ---
    const applyTheme = (config: any, levels?: any[]) => {
        const root = document.documentElement;
        // Fallback-Logik: Nutze 'branding' aus dem Config-Objekt ODER direkte Properties (für Preview)
        const primary = config.branding?.primary_color || config.primary_color || '#22C55E';
        const bg = config.branding?.background_color || config.background_color || '#F8FAFC';
        const sidebar = config.branding?.sidebar_color || config.sidebar_color || '#1E293B';

        // 1. Primärfarbe (Buttons & Akzente)
        if (primary) {
            root.style.setProperty('--primary-color', primary);
            root.style.setProperty('--button-primary-hover', getAdjustedColor(primary, -20));
            root.style.setProperty('--sidebar-active-bg', primary);

            const secondary = '#3B82F6';
            root.style.setProperty('--button-secondary-hover', getAdjustedColor(secondary, -20));

            const danger = '#ef4444';
            root.style.setProperty('--button-danger-hover', getAdjustedColor(danger, -20));
        }

        // 2. Seitenleiste
        if (sidebar) {
            root.style.setProperty('--sidebar-bg', sidebar);
            const contrastColor = getContrastColor(sidebar);
            const isDarkSidebar = contrastColor === '#FFFFFF';

            if (isDarkSidebar) {
                root.style.setProperty('--sidebar-text', 'rgba(255, 255, 255, 0.7)');
                root.style.setProperty('--sidebar-text-hover', '#FFFFFF');
                root.style.setProperty('--sidebar-hover-bg', 'rgba(255,255,255,0.1)');
            } else {
                root.style.setProperty('--sidebar-text', 'rgba(15, 23, 42, 0.7)');
                root.style.setProperty('--sidebar-text-hover', '#0F172A');
                root.style.setProperty('--sidebar-hover-bg', 'rgba(0,0,0,0.05)');
            }
        }

        // 3. App Hintergrund & UI-Elemente
        if (bg) {
            // HIER IST DER FIX: State setzen!
            const isBgDark = isDarkColor(bg);
            setIsDarkMode(isBgDark);

            root.style.setProperty('--background-color', bg);

            if (isBgDark) {
                // Dark Mode Logik
                root.style.setProperty('--text-primary', '#F8FAFC');
                root.style.setProperty('--text-secondary', '#CBD5E1');
                root.style.setProperty('--card-background', getAdjustedColor(bg, 10));
                root.style.setProperty('--card-background-hover', getAdjustedColor(bg, 20));
                root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.15)');

                // Farbige Akzente (Dunkler/Subtiler für Darkmode)
                root.style.setProperty('--bg-accent-green', 'rgba(34, 197, 94, 0.15)');
                root.style.setProperty('--bg-accent-orange', 'rgba(249, 115, 22, 0.15)');
                root.style.setProperty('--bg-accent-blue', 'rgba(59, 130, 246, 0.15)');
                root.style.setProperty('--bg-accent-purple', 'rgba(168, 85, 247, 0.15)');
                root.style.setProperty('--bg-accent-yellow', 'rgba(234, 179, 8, 0.15)');

                root.style.setProperty('--text-accent-green', '#DCFCE7');
                root.style.setProperty('--text-accent-orange', '#FFEDD5');
                root.style.setProperty('--text-accent-blue', '#DBEAFE');
                root.style.setProperty('--text-accent-purple', '#F3E8FF');
                root.style.setProperty('--text-accent-yellow', '#FEF9C3');
            } else {
                // Light Mode Logik
                root.style.setProperty('--text-primary', '#0F172A');
                root.style.setProperty('--text-secondary', '#64748B');
                root.style.setProperty('--card-background', '#FFFFFF');
                root.style.setProperty('--card-background-hover', '#F1F5F9');
                root.style.setProperty('--border-color', '#E2E8F0');

                root.style.setProperty('--bg-accent-green', '#F0FDF4');
                root.style.setProperty('--bg-accent-orange', '#FFF7ED');
                root.style.setProperty('--bg-accent-blue', '#EFF6FF');
                root.style.setProperty('--bg-accent-purple', '#FAF5FF');
                root.style.setProperty('--bg-accent-yellow', '#FEFCE8');

                root.style.setProperty('--text-accent-green', '#166534');
                root.style.setProperty('--text-accent-orange', '#9A3412');
                root.style.setProperty('--text-accent-blue', '#1E40AF');
                root.style.setProperty('--text-accent-purple', '#6B21A8');
                root.style.setProperty('--text-accent-yellow', '#854D0E');
            }

            // 4. Level Colors
            const levelsToUse = levels || config.levels || [];
            if (levelsToUse && levelsToUse.length > 0) {
                levelsToUse.forEach((l: any, idx: number) => {
                    const levelIndex = idx + 1;
                    const color = l.color || (levelIndex === 1 ? '#A855F7' : levelIndex === 2 ? '#22C55E' : levelIndex === 3 ? '#3B82F6' : levelIndex === 4 ? '#F97316' : '#D97706');

                    root.style.setProperty(`--level-${levelIndex}-color`, color);
                    // Generiere eine hellere Hintergrundfarbe (Alpha 0.15 = hex 26)
                    root.style.setProperty(`--level-${levelIndex}-color-bg`, color.length === 7 ? `${color}26` : `${color}2`);
                });
            } else {
                // Fallback zu den Standardwerten (Legacy)
                root.style.setProperty('--level-1-color-bg', 'var(--bg-accent-purple)');
                root.style.setProperty('--level-1-color', isBgDark ? '#A855F7' : '#9333EA');

                root.style.setProperty('--level-2-color-bg', 'var(--bg-accent-green)');
                root.style.setProperty('--level-2-color', isBgDark ? '#22C55E' : '#16A34A');

                root.style.setProperty('--level-3-color-bg', 'var(--bg-accent-blue)');
                root.style.setProperty('--level-3-color', isBgDark ? '#3B82F6' : '#0284C7');

                root.style.setProperty('--level-4-color-bg', 'var(--bg-accent-orange)');
                root.style.setProperty('--level-4-color', isBgDark ? '#F97316' : '#D97706');

                root.style.setProperty('--level-5-color-bg', 'var(--bg-accent-yellow)');
                root.style.setProperty('--level-5-color', isBgDark ? '#D97706' : '#A16207');
            }

            // Generic Level States
            if (isBgDark) {
                root.style.setProperty('--level-completed-bg', '#DCFCE7');
                root.style.setProperty('--level-completed-text', '#166534');
                root.style.setProperty('--level-active-bg', '#DCFCE7');
                root.style.setProperty('--level-active-text', '#166534');
                root.style.setProperty('--level-locked-bg', 'rgba(254, 242, 242, 0.1)');
                root.style.setProperty('--level-locked-text', '#991B1B');
            } else {
                root.style.setProperty('--level-completed-bg', 'var(--bg-accent-green)');
                root.style.setProperty('--level-completed-text', 'var(--text-accent-green)');
                root.style.setProperty('--level-active-bg', 'var(--bg-accent-green)');
                root.style.setProperty('--level-active-text', 'var(--text-accent-green)');
                root.style.setProperty('--level-locked-bg', '#FEF2F2');
                root.style.setProperty('--level-locked-text', '#991B1B');
            }
        }
    };

    // --- CONFIG LADEN (LIVE MODE) ---
    useEffect(() => {
        const loadConfig = async () => {
            const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview';

            if (isPreview) {
                const hash = window.location.hash;
                if (hash.startsWith('#config=')) {
                    try {
                        const encoded = hash.substring(8);
                        const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));

                        applyTheme(decoded, decoded.levels); // Hier werden auch die Farben gesetzt
                        setSchoolName(decoded.school_name || 'PfotenCard');
                        setPreviewConfig(prev => ({
                            ...prev,
                            logoUrl: decoded.logo || 'https://ctsoisfxbhaynonnudua.supabase.co/storage/v1/object/public/public_uploads/paw.png',
                            levels: decoded.levels,
                            services: decoded.services,
                            viewMode: decoded.view_mode || 'app',
                            balance: decoded.balance,
                            activeModules: decoded.active_modules,
                            levelTerm: decoded.level_term,
                            vipTerm: decoded.vip_term
                        }));
                    } catch (e) {
                        console.error("Failed to parse config from hash", e);
                    }
                }
                return;
            }

            try {
                const config = await apiClient.getConfig();
                setAppConfigData(config);
                if (config.tenant?.name) setSchoolName(config.tenant.name);
                applyTheme({ branding: config.tenant?.config?.branding || {} }, config.levels);
            } catch (error) {
                console.error("Config Load Error", error);
            }
        };

        loadConfig();

        // Preview Listener (Echtzeit-Updates)
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'UPDATE_CONFIG') {
                const payload = event.data.payload;
                applyTheme(payload, payload.levels); // WICHTIG: Dies setzt setIsDarkMode basierend auf der Payload
                setSchoolName(payload.school_name || 'PfotenCard');

                setPreviewConfig(prev => ({
                    ...prev,
                    logoUrl: payload.logo || 'https://ctsoisfxbhaynonnudua.supabase.co/storage/v1/object/public/public_uploads/paw.png',
                    levels: payload.levels,
                    services: payload.services,
                    viewMode: payload.view_mode,
                    balance: payload.balance,
                    activeModules: payload.active_modules,
                    levelTerm: payload.level_term,
                    vipTerm: payload.vip_term
                }));

                if (payload.role && loggedInUser) {
                    setLoggedInUser((prev: any) => prev ? { ...prev, role: payload.role } : null);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [loggedInUser]);

    // --- MOCK DATA FOR PREVIEW MODE ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'preview') {
            const mockUserCustomer: User = {
                id: '999',
                name: 'Max Mustermann',
                email: 'max@beispiel.de',
                role: 'customer',
                createdAt: new Date()
            };
            const mockUserAdmin: User = {
                id: '888',
                name: 'Anna Admin',
                email: 'admin@hundeschule.de',
                role: 'admin',
                createdAt: new Date()
            };

            const mockCustomerData = {
                ...mockUserCustomer,
                balance: 150.00,
                level_id: 2,
                dogs: [{ name: 'Bello', breed: 'Golden Retriever', birth_date: '2022-05-10', chip: '123456789' }],
                is_vip: false,
                is_expert: false,
                customer_since: new Date('2024-01-15'),
                achievements: []
            };

            const mockUserCustomerWithDogs = {
                ...mockUserCustomer,
                dogs: mockCustomerData.dogs
            };

            const mockUserAdminWithDogs = {
                ...mockUserAdmin,
                dogs: []
            };

            setLoggedInUser(mockUserCustomer);
            setAuthToken('preview-token');

            // --- ERWEITERTE MOCK DATEN FÜR PREVIEW ---
            const mockTransactions = [
                { id: 1, user_id: '999', amount: -25.00, description: 'Gruppenstunde', date: new Date().toISOString() },
                { id: 2, user_id: '999', amount: 50.00, description: 'Guthaben Aufladung', date: new Date(Date.now() - 86400000).toISOString() },
                { id: 3, user_id: '999', amount: -25.00, description: 'Social Walk', date: new Date(Date.now() - 172800000).toISOString() }
            ];

            const mockNews = [
                { id: 1, title: 'Willkommen in der App!', content: 'Schön, dass du da bist. Hier erfährst du alles Wichtige.', created_at: new Date().toISOString() },
                { id: 2, title: 'Neue Kurse im März', content: 'Wir starten neue Welpenkurse. Melde dich jetzt an!', created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
            ];

            const mockAppointments = [
                { id: 1, title: 'Gruppenstunde', start_time: new Date(Date.now() + 3600000 * 2).toISOString(), end_time: new Date(Date.now() + 3600000 * 3).toISOString(), location: 'Trainingsplatz 1' },
                { id: 2, title: 'Einzelstunde', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(), location: 'Waldweg' }
            ];

            const mockConversations = [
                { id: 1, partner_id: '888', partner_name: 'Anna Admin', last_message: 'Hallo! Wie geht es Bello?', last_message_at: new Date().toISOString(), unread_count: 1 }
            ];

            const mockMessages = [
                { id: 1, sender_id: '888', receiver_id: '999', message: 'Hallo! Wie geht es Bello?', created_at: new Date(Date.now() - 3600000).toISOString() },
                { id: 2, sender_id: '999', receiver_id: '888', message: 'Sehr gut, danke!', created_at: new Date(Date.now() - 3500000).toISOString() }
            ];

            queryClient.setQueryData(['users', 'preview-token'], [mockUserCustomerWithDogs, mockUserAdminWithDogs]);
            queryClient.setQueryData(['transactions', 'preview-token', 'all'], mockTransactions);
            queryClient.setQueryData(['news', 'preview-token'], mockNews);
            queryClient.setQueryData(['appointments', 'preview-token'], mockAppointments);
            queryClient.setQueryData(['chat', 'preview-token'], mockConversations);
            queryClient.setQueryData(['chatMessages', '888', 'preview-token'], mockMessages);
            queryClient.setQueryData(['user', 'preview-token'], mockCustomerData);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 992;
            setIsMobileView(isMobile);
            if (!isMobile) setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ... (QR Code und Auth Logic UNVERÄNDERT) ...
    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/customer\/([a-zA-Z0-9-]+)/);

        if (match && match[1]) {
            const identifier = match[1];
            const isUuid = identifier.includes('-');

            // SECURITY: Only allow UUID access, reject numeric IDs
            if (!isUuid) {
                alert("Zugriff nur über QR-Code möglich. Bitte scannen Sie den QR-Code auf der Kundenkarte.");
                window.history.pushState({}, '', '/');
                handleSetView({ page: 'dashboard' });
                return;
            }

            // Check if authentication is required
            const isAuthRequired = REQUIRE_AUTH_FOR_CUSTOMER_VIEW;
            const isUserLoggedIn = !!loggedInUser;

            // If auth is required and user is not logged in, redirect to login
            if (isAuthRequired && !isUserLoggedIn) {
                // Don't do anything - AuthScreen will be shown
                return;
            }

            // If user is a customer (not staff), skip this logic
            if (isUserLoggedIn && (loggedInUser.role === 'customer' || loggedInUser.role === 'kunde')) {
                return;
            }

            // Falls wir schon auf der richtigen Seite sind, überspringen
            if (view.page === 'customers' && view.subPage === 'detail' && view.customerId === identifier) {
                return;
            }

            setServerLoading({ active: true, message: 'Lade Kundendaten...' });

            // Determine which endpoint to use based on authentication status
            let endpoint: string;
            if (authToken) {
                // If logged in, use authenticated endpoint with UUID
                endpoint = `/api/users/by-auth/${identifier}`;
            } else {
                // If not logged in, use public endpoint (supports UUID only)
                endpoint = `/api/public/users/${identifier}`;
            }

            apiClient.get(endpoint, authToken)
                .then(customerData => {
                    setDirectAccessedCustomer(customerData);
                    handleSetView({ page: 'customers', subPage: 'detail', customerId: String(customerData.id) });
                })
                .catch(err => {
                    console.error("Fehler beim Laden des Kunden via QR-Code:", err);
                    if (!isAuthRequired && err.toString().includes('401')) {
                        alert("Dieser Kunde konnte nicht gefunden werden oder Sie haben keine Berechtigung.");
                    } else {
                        alert("Kunde konnte nicht gefunden oder geladen werden.");
                    }
                    window.history.pushState({}, '', '/');
                    handleSetView({ page: 'dashboard' });
                })
                .finally(() => {
                    setServerLoading({ active: false, message: '' });
                });
        }
    }, [loggedInUser, authToken]);

    useEffect(() => {
        const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview';
        if (isPreview) return;

        // 1. Check direkt beim Laden (falls der Hash schon da ist)
        const initialHash = window.location.hash;
        if (initialHash && (initialHash.includes('type=invite') || initialHash.includes('type=recovery'))) {
            setShowPasswordReset(true);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setShowPasswordReset(true);
            } else if (event === 'SIGNED_IN' && session) {

                // 2. Check beim Login-Event (Supabase-Event)
                const currentHash = window.location.hash;
                // Prüfen ob es sich um einen Invite oder Recovery Link handelt
                if (currentHash && (currentHash.includes('type=invite') || currentHash.includes('type=recovery'))) {
                    setShowPasswordReset(true);
                }

                // Fallback für die alte Logik (falls doch mal der Pfad genutzt wird)
                if (window.location.pathname === '/update-password') {
                    setShowPasswordReset(true);
                }

                if (!loggedInUser || loggedInUser.auth_id !== session.user.id) {
                    try {
                        const userResponse = await apiClient.get('/api/users/me', session.access_token);
                        handleLoginSuccess(session.access_token, userResponse);
                    } catch (err) {
                        console.error("Auth Change Error:", err);
                    }
                }
            } else if (event === 'TOKEN_REFRESHED' && session) {
                // HIER DER FIX: Token erneuern, damit API Calls weiter funktionieren
                console.log('PfotenCard: Token refreshed!', session.access_token.substring(0, 10) + '...');
                localStorage.setItem('authToken', session.access_token);
                setAuthToken(session.access_token);
            } else if (event === 'SIGNED_OUT') {
                handleLogout();
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, [loggedInUser]);

    const handlePasswordUpdate = async () => {
        if (!newPassword) return alert("Bitte Passwort eingeben");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (!error) {
            alert("Passwort erfolgreich geändert!");
            setShowPasswordReset(false);
            setNewPassword('');
        } else {
            alert("Fehler: " + error.message);
        }
    };

    const handleSetView = (newView: View) => {
        console.log("PfotenCard: Changing view to", newView);
        // Update URL based on the new view
        let newPath = '/';
        if (newView.page === 'dashboard') {
            newPath = '/';
        } else if (newView.page === 'customers') {
            if (newView.subPage === 'detail' && newView.customerId) {
                // Ensure we use auth_id (UUID) in the URL if available
                let urlId = newView.customerId;
                if (!urlId.includes('-')) {
                    // It's a numeric ID, try to find the UUID
                    const customer = customers.find(c => String(c.id) === String(urlId));
                    if (customer && customer.auth_id) {
                        urlId = customer.auth_id;
                    }
                }
                newPath = `/customer/${urlId}`;
            } else {
                newPath = '/customers';
            }
        } else if (newView.page === 'chat') {
            if (newView.chatPartnerId) {
                newPath = `/chat/${newView.chatPartnerId}`;
            } else {
                newPath = '/chat';
            }
        } else if (['news', 'appointments', 'users', 'reports', 'transactions', 'impressum', 'datenschutz', 'agb'].includes(newView.page)) {
            newPath = `/${newView.page}`;
        }

        if (window.location.pathname !== newPath) {
            window.history.pushState({}, '', newPath);
        }

        if (view.customerId && newView.customerId !== view.customerId) {
            setDirectAccessedCustomer(null);
        }

        if (newView.page === 'news') {
            setHasNewNews(false);
            const lastSeenId = localStorage.getItem('last_seen_news_id');
            const latestId = appDataRef.current?.newsId;
            if (latestId && (!lastSeenId || parseInt(lastSeenId) < latestId)) {
                localStorage.setItem('last_seen_news_id', String(latestId));
            }
        }

        setView(newView);
    };

    const appDataRef = useRef<{ newsId?: number }>({});

    useEffect(() => {
        if (!authToken || isPreviewMode) return;

        const checkNotifications = async () => {
            try {
                const conversations = await apiClient.getConversations(authToken);
                const unread = conversations.reduce((acc: number, conv: any) => acc + (conv.unread_count || 0), 0);
                setUnreadChatCount(unread);

                const news = await apiClient.getNews(authToken);
                if (news && news.length > 0) {
                    const latestId = news[0].id;
                    appDataRef.current.newsId = latestId;
                    const lastSeenId = localStorage.getItem('last_seen_news_id');

                    if (!lastSeenId || parseInt(lastSeenId) < latestId) {
                        if (view.page === 'news') {
                            localStorage.setItem('last_seen_news_id', String(latestId));
                            setHasNewNews(false);
                        } else {
                            setHasNewNews(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Notification polling error:", error);
            }
        };

        checkNotifications();
        const interval = setInterval(checkNotifications, 10000);
        return () => clearInterval(interval);
    }, [authToken, view.page]);

    useEffect(() => {
        if (!authToken || !loggedInUser || isPreviewMode) return;

        queryClient.prefetchQuery({
            queryKey: ['appointments', authToken],
            queryFn: () => apiClient.getAppointments(authToken)
        });
        queryClient.prefetchQuery({
            queryKey: ['news', authToken],
            queryFn: () => apiClient.getNews(authToken)
        });
        queryClient.prefetchQuery({
            queryKey: ['chat', authToken],
            queryFn: () => apiClient.getConversations(authToken)
        });
    }, [authToken, loggedInUser, isPreviewMode, queryClient]);

    const handleUpdateAppStatus = async (status: 'active' | 'cancelled' | 'partial', message: string) => {
        if (!authToken) return;
        try {
            const newStatus = await apiClient.updateAppStatus({ status, message }, authToken);
            queryClient.setQueryData(['appStatus', authToken], newStatus);
        } catch (e) {
            console.error("Failed to update status", e);
            alert("Fehler beim Aktualisieren des Status.");
        }
    };

    const fetchAppData = async (_forceLoadingScreen: boolean = false) => {
        if (!authToken || isPreviewMode) return;
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['user', authToken] }),
            queryClient.invalidateQueries({ queryKey: ['users', authToken] }),
            queryClient.invalidateQueries({ queryKey: ['transactions', authToken] }),
            queryClient.invalidateQueries({ queryKey: ['appStatus', authToken] })
        ]);
    };

    useEffect(() => {
        if (!userQuery.error || isPreviewMode) return;
        const error = userQuery.error as Error;
        const message = error.message || '';
        const isAuthError = message.includes('401') || message.includes('Session expired') || message.includes('Unauthorized');
        if (!isAuthError) return;

        const refreshSession = async () => {
            console.log("Token abgelaufen, versuche Refresh via Supabase...");
            const { data, error: sessionError } = await supabase.auth.getSession();

            if (data.session && !sessionError) {
                console.log("Refresh erfolgreich! Neues Token setzen.");
                const newToken = data.session.access_token;
                localStorage.setItem('authToken', newToken);
                setAuthToken(newToken);
                return;
            }

            handleLogout();
        };

        refreshSession();
    }, [userQuery.error, isPreviewMode]);

    useEffect(() => {
        if (schoolName) {
            document.title = `${schoolName} - Pfotencard`;
        }

        const rawLogoUrl = appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl;
        // Stelle sicher, dass wir eine absolute URL haben für Windows/Manifest
        const baseUrl = getFullImageUrl(rawLogoUrl);
        const fullLogoUrl = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : window.location.origin + baseUrl) : window.location.origin + '/paw.png';

        // --- 1. Dynamic Favicon (Browser Tab) ---
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = fullLogoUrl;
        link.type = "image/png"; // Explizit PNG setzen für Windows Kompatibilität

        // --- 2. Apple Touch Icon (iOS Fix: Schwarzer Hintergrund) ---
        generateOpaqueIcon(fullLogoUrl, '#FFFFFF').then((opaqueIconUrl) => {
            let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleLink) {
                appleLink = document.createElement('link');
                appleLink.rel = 'apple-touch-icon';
                document.head.appendChild(appleLink);
            }
            appleLink.href = opaqueIconUrl;
        });

        // --- 3. Dynamic Manifest (Android & Windows Fixes) ---
        const manifest = {
            id: window.location.origin + "/",
            scope: window.location.origin + "/",
            short_name: schoolName || "PfotenCard",
            name: schoolName ? `${schoolName}` : "PfotenCard",
            // ANDROID FIX: Kein 'maskable' verwenden, wenn das Bild nicht dafür gemacht ist (verhindert Abschneiden)
            // WINDOWS FIX: Absolute URLs verwenden
            icons: [
                {
                    src: fullLogoUrl,
                    type: "image/png",
                    sizes: "192x192",
                    purpose: "any"
                },
                {
                    src: fullLogoUrl,
                    type: "image/png",
                    sizes: "512x512",
                    purpose: "any"
                }
            ],
            start_url: window.location.origin + "/",
            display: "standalone",
            theme_color: appConfigData?.tenant?.config?.branding?.primary_color || "#22C55E",
            background_color: "#FFFFFF",
            orientation: "portrait"
        };

        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);

        const manifestLink = document.querySelector('#app-manifest');
        if (manifestLink) {
            manifestLink.setAttribute('href', manifestURL);
        }

        // --- 4. Windows Tile Fix (NEU HINZUFÜGEN) ---
        // Windows benötigt spezielle Meta-Tags für das Startmenü-Icon
        let msTileImg: HTMLMetaElement | null = document.querySelector("meta[name='msapplication-TileImage']");
        if (!msTileImg) {
            msTileImg = document.createElement('meta');
            msTileImg.name = 'msapplication-TileImage';
            document.head.appendChild(msTileImg);
        }
        msTileImg.content = fullLogoUrl;

        let msTileColor: HTMLMetaElement | null = document.querySelector("meta[name='msapplication-TileColor']");
        if (!msTileColor) {
            msTileColor = document.createElement('meta');
            msTileColor.name = 'msapplication-TileColor';
            document.head.appendChild(msTileColor);
        }
        msTileColor.content = appConfigData?.tenant?.config?.branding?.primary_color || "#22C55E";

    }, [schoolName, appConfigData, previewConfig.logoUrl]);

    const handleLoginSuccess = (token: string, user: any) => {
        localStorage.setItem('authToken', token);
        setAuthToken(token);
        setLoggedInUser(user);
        queryClient.setQueryData(['user', token], user);
        setServerLoading({ active: false, message: '' });
    };

    const handleLogout = async () => {
        if (isLoggingOut.current) return;

        isLoggingOut.current = true;

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out from Supabase:", error);
        }

        localStorage.removeItem('authToken');
        setAuthToken(null);
        setLoggedInUser(null);
        queryClient.clear();
        setDirectAccessedCustomer(null);
        window.history.pushState({}, '', '/');

        setTimeout(() => {
            isLoggingOut.current = false;
        }, 1000);
    };

    const updateTransactionsCache = (updater: (prev: any[]) => any[]) => {
        if (!authToken) return;
        queryClient.setQueryData(['transactions', authToken, 'all'], (prev: any) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return updater(safePrev);
        });
    };

    const updateUsersCache = (updater: (prev: any[]) => any[]) => {
        if (!authToken) return;
        queryClient.setQueryData(['users', authToken], (prev: any) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return updater(safePrev);
        });
    };

    const handleConfirmTransaction = async (txData: {
        title: string;
        amount: number;
        type: 'topup' | 'debit';
        meta?: { requirementId?: string };
        baseAmount?: number;
        bonus?: number;
        dogId?: number | null;
        dogName?: string;
    }) => {
        if (isPreviewMode) {
            const newTx = {
                id: `tx-preview-${Date.now()}`,
                user_id: view.customerId,
                type: txData.type === 'topup' ? 'Aufladung' : txData.title,
                description: txData.title,
                amount: txData.amount,
                date: new Date().toISOString(),
                booked_by_id: loggedInUser?.id
            };

            updateTransactionsCache(prev => [newTx, ...prev]);
            updateUsersCache(prev => prev.map(c => {
                if (String(c.id) === view.customerId) {
                    return { ...c, balance: c.balance + txData.amount };
                }
                return c;
            }));

            if (loggedInUser?.id === view.customerId) {
                setLoggedInUser((prev: any) => ({ ...prev, balance: (prev.balance || 0) + txData.amount }));
            }

            console.log('Preview-Transaktion erfolgreich simuliert!');
            return;
        }

        if (!view.customerId || !authToken) return;

        // --- OPTIMISTIC UI ---
        const tempId = `temp-${Date.now()}`;
        const amount = txData.amount;
        const previousTransactions = queryClient.getQueryData(['transactions', authToken, 'all']) as any[] || [];
        const previousUsers = queryClient.getQueryData(['users', authToken]) as any[] || [];
        const previousLoggedInUser = loggedInUser ? { ...loggedInUser } : null;

        const optimisticTx = {
            id: tempId,
            user_id: view.customerId.startsWith('cust-') 
                ? (parseInt(view.customerId.replace('cust-', ''), 10) || 0)
                : view.customerId,
            type: txData.type === 'topup' ? 'Aufladung' : txData.title,
            description: txData.title,
            amount: amount,
            bonus: txData.type === 'topup' ? (txData.bonus || 0) : 0,
            date: new Date().toISOString(),
            booked_by_id: loggedInUser?.id
        };

        updateTransactionsCache(prev => [optimisticTx, ...prev]);
        updateUsersCache(prev => prev.map(c => {
            if (String(c.id) === view.customerId) {
                return { ...c, balance: (c.balance || 0) + amount };
            }
            return c;
        }));

        if (directAccessedCustomer && String(directAccessedCustomer.id) === view.customerId) {
            setDirectAccessedCustomer((prev: any) => ({
                ...prev,
                balance: (prev.balance || 0) + amount
            }));
        }

        if (loggedInUser && String(loggedInUser.id) === view.customerId) {
            setLoggedInUser((prev: any) => ({ ...prev, balance: (prev.balance || 0) + amount }));
        }

        const transactionPayload = {
            user_id: optimisticTx.user_id,
            type: optimisticTx.type,
            description: optimisticTx.description,
            amount: (txData.type === 'topup' && txData.baseAmount !== undefined) ? txData.baseAmount : optimisticTx.amount,
            training_type_id: txData.meta?.requirementId ? (parseInt(txData.meta.requirementId) || null) : null,
            dog_id: txData.dogId || null // NEU
        };

        try {
            await apiClient.post('/api/transactions', transactionPayload, authToken);
            console.log('Transaktion erfolgreich gebucht!');
            fetchAppData(false);
        } catch (error) {
            console.error("Fehler beim Buchen der Transaktion:", error);
            queryClient.setQueryData(['transactions', authToken, 'all'], previousTransactions);
            queryClient.setQueryData(['users', authToken], previousUsers);
            if (previousLoggedInUser) setLoggedInUser(previousLoggedInUser);
            alert(`Fehler beim Buchen: ${error}`);
        }
    };

    const handleAddCustomer = async (newCustomerData: any) => {
        if (!loggedInUser) return;

        const payload = {
            name: `${newCustomerData.firstName} ${newCustomerData.lastName}`.trim(),
            email: newCustomerData.email,
            role: "customer",
            is_active: true,
            balance: 0.0,
            phone: newCustomerData.phone,
            dogs: [
                {
                    name: newCustomerData.dogName,
                    breed: newCustomerData.dogBreed || null,
                    birth_date: newCustomerData.dogBirthDate || null,
                    chip: newCustomerData.chip || null
                }
            ]
        };

        try {
            await apiClient.post('/api/users', payload, authToken);
            await fetchAppData();
            console.log('Kunde erfolgreich angelegt!');
        } catch (error) {
            console.error("Fehler beim Anlegen des Kunden:", error);
            alert(`Fehler: ${error}`);
        }
    };

    const handleLevelUp = async (customerId: string, newLevelId: number, dogId?: number) => {
        // Optimistisches Update für UI
        updateUsersCache(prev => prev.map(u => {
            if (String(u.id) === customerId || u.auth_id === customerId) {
                if (dogId) {
                    return {
                        ...u,
                        dogs: (u.dogs || []).map((d: any) => d.id === dogId ? { ...d, current_level_id: newLevelId } : d)
                    };
                } else {
                    return { ...u, current_level_id: newLevelId, level_id: newLevelId };
                }
            }
            return u;
        }));

        if (directAccessedCustomer && (String(directAccessedCustomer.id) === customerId || directAccessedCustomer.auth_id === customerId)) {
            setDirectAccessedCustomer((prev: any) => {
                if (!prev) return prev;
                if (dogId) {
                    return {
                        ...prev,
                        dogs: (prev.dogs || []).map((d: any) => d.id === dogId ? { ...d, current_level_id: newLevelId } : d)
                    };
                } else {
                    return { ...prev, current_level_id: newLevelId, level_id: newLevelId };
                }
            });
        }

        try {
            const url = dogId ? `/api/users/${customerId}/level-up?dog_id=${dogId}` : `/api/users/${customerId}/level-up`;
            await apiClient.post(url, {}, authToken);
            console.log(`Kunde erfolgreich hochgestuft!`);
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Level-Up:", error);
            await fetchAppData();
            if (error.toString().includes("Requirements not met")) {
                alert("Fehler: Voraussetzungen für den Aufstieg sind noch nicht erfüllt.");
            } else {
                alert(`Fehler: ${error}`);
            }
        }
    };

    const onToggleVipStatus = async (customer: any) => {
        const newStatus = !customer.is_vip;
        const payload = { is_vip: newStatus, is_expert: false };
        try {
            await apiClient.put(`/api/users/${customer.id}/status`, payload, authToken);
            await fetchAppData();
            console.log(`VIP Status für ${customer.name} auf ${newStatus} gesetzt.`);
        } catch (error) {
            console.error("Fehler beim Ändern des VIP Status:", error);
        }
    };

    const onToggleExpertStatus = async (customer: any) => {
        const newStatus = !customer.is_expert;
        const payload = { is_expert: newStatus, is_vip: false };
        try {
            await apiClient.put(`/api/users/${customer.id}/status`, payload, authToken);
            await fetchAppData();
            console.log(`Experten-Status für ${customer.name} auf ${newStatus} gesetzt.`);
        } catch (error) {
            console.error("Fehler beim Ändern des Experten-Status:", error);
        }
    };

    const handleSaveUser = async (userData: any) => {
        if (userModal.user) {
            try {
                await apiClient.put(`/api/users/${userModal.user.id}`, userData, authToken);
                await fetchAppData();
                console.log('Benutzer erfolgreich aktualisiert!');
            } catch (error) {
                console.error("Fehler beim Aktualisieren des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
        } else {
            try {
                await apiClient.post('/api/users', userData, authToken);
                await fetchAppData();
                console.log('Benutzer erfolgreich angelegt!');
            } catch (error) {
                console.error("Fehler beim Anlegen des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
        }
        setUserModal({ isOpen: false, user: null });
    };

    const handleDeleteUser = async () => {
        if (deleteUserModal) {
            try {
                await apiClient.delete(`/api/users/${deleteUserModal.id}`, authToken);
                await fetchAppData();
                console.log('Benutzer erfolgreich gelöscht!');

                // Redirect to customer list if we were in a customer detail view
                if (view.page === 'customers' && view.subPage === 'detail') {
                    handleSetView({ page: 'customers' });
                }
                // Redirect to users list if we were in users page (to refresh correctly)
                else if (view.page === 'users') {
                    handleSetView({ page: 'users' });
                }

            } catch (error) {
                console.error("Fehler beim Löschen des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
            setDeleteUserModal(null);
        }
    };

    const handleSaveCustomerDetails = async (userToUpdate: any, dogToUpdate: any) => {
        if (isPreviewMode) {
            updateUsersCache(prev => prev.map(c => {
                if (c.id === userToUpdate.id) {
                    const updatedC = { ...c, ...userToUpdate };
                    if (dogToUpdate) {
                        updatedC.dogs = [dogToUpdate];
                    }
                    return updatedC;
                }
                return c;
            }));
            if (loggedInUser && loggedInUser.id === userToUpdate.id) {
                setLoggedInUser((prev: any) => ({ ...prev, ...userToUpdate }));
            }
            console.log('Preview-Daten erfolgreich lokal gespeichert!');
            return;
        }

        const previousUsers = queryClient.getQueryData(['users', authToken]) as any[] || [];
        const previousLoggedInUser = loggedInUser ? { ...loggedInUser } : null;

        updateUsersCache(prev => prev.map(c => {
            if (c.id === userToUpdate.id) {
                const updatedC = { ...c, ...userToUpdate };
                if (dogToUpdate) {
                    const existingDogIndex = updatedC.dogs?.findIndex((d: any) => d.id === dogToUpdate.id);
                    if (existingDogIndex !== undefined && existingDogIndex > -1) {
                        updatedC.dogs[existingDogIndex] = { ...updatedC.dogs[existingDogIndex], ...dogToUpdate };
                    } else {
                        updatedC.dogs = [dogToUpdate, ...(updatedC.dogs || [])];
                    }
                }
                return updatedC;
            }
            return c;
        }));

        if (directAccessedCustomer && directAccessedCustomer.id === userToUpdate.id) {
            setDirectAccessedCustomer((prev: any) => ({ ...prev, ...userToUpdate }));
        }

        if (loggedInUser && loggedInUser.id === userToUpdate.id) {
            setLoggedInUser((prev: any) => ({ ...prev, ...userToUpdate }));
        }

        try {
            const userPayload = {
                name: userToUpdate.name,
                email: userToUpdate.email || null,
                role: userToUpdate.role,
                level_id: userToUpdate.level_id,
                is_active: userToUpdate.is_active,
                balance: userToUpdate.balance,
                phone: userToUpdate.phone || null,
            };
            await apiClient.put(`/api/users/${userToUpdate.id}`, userPayload, authToken);

            if (dogToUpdate) {
                const cleanDogData = {
                    name: dogToUpdate.name,
                    chip: dogToUpdate.chip || null,
                    breed: dogToUpdate.breed || null,
                    birth_date: dogToUpdate.birth_date || null,
                    current_level_id: dogToUpdate.current_level_id, // FIX: Level mit übergeben
                };

                let savedDog;
                if (dogToUpdate.id) {
                    savedDog = await apiClient.put(`/api/dogs/${dogToUpdate.id}`, cleanDogData, authToken);
                    console.log('Hund aktualisiert');
                } else {
                    savedDog = await apiClient.post(`/api/users/${userToUpdate.id}/dogs`, cleanDogData, authToken);
                    console.log('Neuer Hund angelegt');
                }

                // Wenn ein Bild in dogToUpdate vorhanden ist (aus dem Modal via handleSaveDog -> setDogFormModal -> DogFormModal),
                // aber handleSaveCustomerDetails wird direkt aus CustomerDetailPage aufgerufen.
                // Wir müssen sicherstellen, dass falls ein Bild ausgewählt wurde, es hochgeladen wird.
                if (dogToUpdate.imageFile && savedDog && savedDog.id) {
                    await uploadDogImage(savedDog.id, dogToUpdate.imageFile);
                }
            }

            console.log('Kundendaten erfolgreich gespeichert!');
            fetchAppData(false);
        } catch (error) {
            console.error("Fehler beim Speichern der Kundendaten:", error);
            queryClient.setQueryData(['users', authToken], previousUsers);
            if (previousLoggedInUser) setLoggedInUser(previousLoggedInUser);
            alert(`Fehler beim Speichern: ${error}`);
        }
    };
    const handleUploadDocuments = async (files: File[], customerId: string) => {
        if (!authToken) return;

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('upload_file', file);
                await apiClient.uploadDocuments(customerId, formData, authToken);
            }

            console.log('Dokumente erfolgreich hochgeladen!');
            fetchAppData(false);
        } catch (error) {
            console.error("Fehler beim Hochladen der Dokumente:", error);
            const errorMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
            alert(`Fehler beim Upload: ${errorMsg}`);
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        if (!authToken) return;

        try {
            await apiClient.delete(`/api/documents/${documentId}`, authToken);
            await fetchAppData();
            console.log('Dokument erfolgreich gelöscht!');
        } catch (error) {
            console.error("Fehler beim Löschen des Dokuments:", error);
            const msg = error instanceof Error ? error.message : String(error);
            alert(`Fehler beim Löschen: ${msg}`);
        }
    };

    const handleSaveDog = async (dogData: any, customerId: string) => {
        if (!authToken) return;

        try {
            let savedDog;
            if (dogData.id) {
                savedDog = await apiClient.put(`/api/dogs/${dogData.id}`, dogData, authToken);
            } else {
                savedDog = await apiClient.post(`/api/users/${customerId}/dogs`, dogData, authToken);
            }

            // Wenn ein Bild ausgewählt wurde, dieses jetzt hochladen
            if (dogData.imageFile && savedDog && savedDog.id) {
                await uploadDogImage(savedDog.id, dogData.imageFile);
            }

            await fetchAppData();
            console.log('Hund erfolgreich gespeichert!');
        } catch (error) {
            console.error("Fehler beim Speichern des Hundes:", error);
            alert(`Fehler: ${error}`);
        }
        setDogFormModal({ isOpen: false, dog: null });
    };

    const uploadDogImage = async (dogId: number, imageFile: File) => {
        const formData = new FormData();
        formData.append('upload_file', imageFile);
        
        const headers: any = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        const subdomain = getSubdomain();
        if (subdomain) headers['x-tenant-subdomain'] = subdomain;

        return fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/dogs/${dogId}/image`, {
            method: 'POST',
            headers: headers,
            body: formData,
        });
    };

    const handleDeleteDog = async (dogId: string) => {
        if (!authToken) return;

        try {
            await apiClient.delete(`/api/dogs/${dogId}`, authToken);
            await fetchAppData();
            console.log('Hund erfolgreich gelöscht!');
        } catch (error) {
            console.error("Fehler beim Löschen des Hundes:", error);
            alert(`Fehler: ${error}`);
        }
        setDeletingDog(null);
    };

    if (showPasswordReset) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h1>Passwort zurücksetzen</h1>
                    <p className="subtitle">Geben Sie Ihr neues Passwort ein</p>
                    <PasswordInput
                        label="Neues Passwort"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button className="button button-primary" onClick={handlePasswordUpdate}>Passwort ändern</button>
                </div>
            </div>
        );
    }

    if (isAppLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--background-color)' }}>
                <LoadingSpinner message="Lade App..." />
            </div >
        );
    }

    // --- RENDER CONTENT ---
    const renderContent = () => {
        if (view.page === 'news') {
            return <NewsPage user={loggedInUser} token={authToken} targetAppointmentId={view.targetAppointmentId} isPreviewMode={isPreviewMode} />;
        }
        if (view.page === 'chat') {
            return <ChatPage user={loggedInUser} token={authToken} setView={handleSetView} isPreviewMode={isPreviewMode} initialChatPartnerId={view.chatPartnerId} />;
        }

        if (view.page === 'dashboard') {
            if (loggedInUser && (loggedInUser.role === 'customer' || loggedInUser.role === 'kunde')) {
                const customer = customers.find(c => c.id === loggedInUser.id) || (isPreviewMode ? loggedInUser : null);
                if (!customer) return <div>Lade Daten...</div>;

                return (
                    <CustomerDetailPage
                        customer={customer}
                        transactions={transactions}
                        setView={handleSetView}
                        handleLevelUp={handleLevelUp}
                        onSave={handleSaveCustomerDetails}
                        currentUser={loggedInUser}
                        users={users}
                        onUploadDocuments={handleUploadDocuments}
                        onDeleteDocument={handleDeleteDocument}
                        fetchAppData={fetchAppData}
                        authToken={authToken}
                        onDeleteUserClick={() => { }}
                        onToggleVipStatus={onToggleVipStatus}
                        onToggleExpertStatus={onToggleExpertStatus}
                        setDogFormModal={setDogFormModal}
                        setDeletingDog={setDeletingDog}
                        levels={appConfigData?.levels || previewConfig.levels}
                        wording={appConfigData?.tenant?.config?.wording || (isPreviewMode ? { level: previewConfig.levelTerm || 'Level', vip: previewConfig.vipTerm || 'VIP' } : undefined)}
                        isDarkMode={isDarkMode}
                        isPreviewMode={isPreviewMode}
                        activeModules={activeModules}
                        initialDogId={view.dogId}
                        onConfirmTransaction={handleConfirmTransaction}
                    />
                );
            }

            return (
                <DashboardPage
                    customers={customers}
                    transactions={transactions}
                    currentUser={loggedInUser}
                    onKpiClick={(kpi) => {
                        if (kpi === 'customers') handleSetView({ page: 'customers' });
                    }}
                    setView={handleSetView}
                    appStatus={appStatus}
                    token={authToken}
                    fetchAppData={fetchAppData}
                    balanceConfig={appConfigData?.tenant?.config?.balance || previewConfig.balance}
                    activeModules={activeModules}
                />
            );
        }

        if (view.page === 'transactions') {
            return <CustomerTransactionsPage
                transactions={transactions}
                token={authToken}
                activeModules={activeModules} // NEU
            />;
        }

        if (view.page === 'customers') {
            if (view.subPage === 'detail' && view.customerId) {
                const customer = directAccessedCustomer || customers.find(c => String(c.id) === String(view.customerId) || c.auth_id === view.customerId);
                if (!customer) return <div>Kunde nicht gefunden</div>;

                return (
                    <CustomerDetailPage
                        customer={customer}
                        transactions={transactions}
                        setView={handleSetView}
                        handleLevelUp={handleLevelUp}
                        onSave={handleSaveCustomerDetails}
                        currentUser={loggedInUser}
                        users={users}
                        onUploadDocuments={handleUploadDocuments}
                        onDeleteDocument={handleDeleteDocument}
                        fetchAppData={fetchAppData}
                        authToken={authToken}
                        onDeleteUserClick={(user) => setDeleteUserModal(user)}
                        onToggleVipStatus={onToggleVipStatus}
                        onToggleExpertStatus={onToggleExpertStatus}
                        setDogFormModal={setDogFormModal}
                        setDeletingDog={setDeletingDog}
                        levels={appConfigData?.levels || previewConfig.levels}
                        wording={appConfigData?.tenant?.config?.wording || (isPreviewMode ? { level: previewConfig.levelTerm || 'Level', vip: previewConfig.vipTerm || 'VIP' } : undefined)}
                        isDarkMode={isDarkMode}
                        isPreviewMode={isPreviewMode}
                        activeModules={activeModules}
                        initialDogId={view.dogId}
                        onConfirmTransaction={handleConfirmTransaction}
                    />
                );
            }

            if (view.subPage === 'transactions' && view.customerId) {
                const customer = customers.find(c => String(c.id) === String(view.customerId) || c.auth_id === view.customerId);
                if (!customer) return <div>Kunde nicht gefunden</div>;

                return (
                    <TransactionManagementPage
                        customer={customer}
                        onConfirmTransaction={handleConfirmTransaction}
                        setView={handleSetView}
                        currentUser={loggedInUser}
                        services={appConfigData?.training_types || previewConfig.services || []}
                        balanceConfig={appConfigData?.tenant?.config?.balance || previewConfig.balance}
                        authToken={authToken}
                        fetchAppData={fetchAppData}
                        initialDogId={view.dogId}
                    />
                );
            }

            return (
                <CustomerListPage
                    customers={customers}
                    transactions={transactions}
                    setView={handleSetView}
                    onKpiClick={(kpi: any) => { }}
                    onAddCustomerClick={() => {
                        if (hasPermission(loggedInUser, 'can_delete_customers')) {
                            setAddCustomerModalOpen(true);
                        } else {
                            alert('Sie haben keine Berechtigung, Kunden hinzuzufügen.');
                        }
                    }}
                    currentUser={loggedInUser}
                    levels={appConfigData?.levels || previewConfig.levels}
                    wording={appConfigData?.tenant?.config?.wording || (isPreviewMode ? { level: previewConfig.levelTerm || 'Level', vip: previewConfig.vipTerm || 'VIP' } : undefined)}
                />
            );
        }

        if (view.page === 'reports') {
            return <ReportsPage
                transactions={transactions}
                customers={customers}
                users={users}
                currentUser={loggedInUser}
                balanceConfig={appConfigData?.tenant?.config?.balance || previewConfig.balance}
            />;
        }

        if (view.page === 'appointments') {
            return (
                <AppointmentsPage
                    user={loggedInUser}
                    token={authToken}
                    setView={handleSetView}
                    appStatus={appStatus}
                    onUpdateStatus={handleUpdateAppStatus}
                    activeModules={activeModules}
                    isDarkMode={isDarkMode}
                />
            );
        }

        if (view.page === 'users') {
            return (
                <UsersPage
                    users={users}
                    onAddUserClick={() => setUserModal({ isOpen: true, user: null })}
                    onEditUserClick={(user) => setUserModal({ isOpen: true, user })}
                    onDeleteUserClick={(user) => setDeleteUserModal(user)}
                    currentUser={loggedInUser}
                />
            );
        }

        if (view.page === 'impressum') {
            return <ImpressumPage onBack={() => handleSetView({ page: 'dashboard' })} />;
        }
        if (view.page === 'datenschutz') {
            return <DatenschutzPage onBack={() => handleSetView({ page: 'dashboard' })} />;
        }
        if (view.page === 'agb') {
            return <AGBPage onBack={() => handleSetView({ page: 'dashboard' })} />;
        }

        return <div>Seite nicht gefunden</div>;
    };

    const isAccessingCustomerPage = view.page === 'customers' && view.subPage === 'detail' && view.customerId;

    const isAccessingLegalPage = ['impressum', 'datenschutz', 'agb'].includes(view.page);
    const allowUnauthenticatedAccess = (!REQUIRE_AUTH_FOR_CUSTOMER_VIEW && isAccessingCustomerPage) || isAccessingLegalPage;

    const activeModules = appConfigData?.tenant?.config?.active_modules || previewConfig.activeModules || ['news', 'documents', 'calendar', 'chat'];

    if (!authToken || !loggedInUser) {
        if (allowUnauthenticatedAccess && (directAccessedCustomer || isAccessingLegalPage)) {
            return (
                <div className="app-container">
                    <div className="main-content" style={{ marginLeft: 0, width: '100%' }}>
                        {isAccessingLegalPage ? renderContent() : (
                            <CustomerDetailPage
                                customer={directAccessedCustomer}
                                transactions={transactions}
                                setView={handleSetView}
                                handleLevelUp={handleLevelUp}
                                onSave={handleSaveCustomerDetails}
                                currentUser={directAccessedCustomer}
                                users={[]}
                                onUploadDocuments={handleUploadDocuments}
                                onDeleteDocument={handleDeleteDocument}
                                fetchAppData={fetchAppData}
                                authToken={null}
                                onDeleteUserClick={() => { }}
                                onToggleVipStatus={onToggleVipStatus}
                                onToggleExpertStatus={onToggleExpertStatus}
                                setDogFormModal={setDogFormModal}
                                setDeletingDog={setDeletingDog}
                                levels={appConfigData?.levels || previewConfig.levels}
                                wording={appConfigData?.tenant?.config?.wording || (isPreviewMode ? { level: previewConfig.levelTerm || 'Level', vip: previewConfig.vipTerm || 'VIP' } : undefined)}
                                isDarkMode={isDarkMode}
                                isPreviewMode={isPreviewMode}
                                activeModules={activeModules}
                                initialDogId={view.dogId}
                                onConfirmTransaction={handleConfirmTransaction} // NEU
                            />
                        )}
                    </div>
                </div>
            );
        }

        return (
            <AuthScreen
                onLoginStart={() => setServerLoading({ active: true, message: 'Anmeldung läuft...' })}
                onLoginEnd={() => setServerLoading({ active: false, message: '' })}
                onLoginSuccess={handleLoginSuccess}
                logoUrl={getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl)}
                schoolName={schoolName}
            />
        );
    }


    if (previewConfig.viewMode === 'login') {
        return (
            <AuthScreen
                onLoginStart={() => { }}
                onLoginEnd={() => { }}
                onLoginSuccess={() => { }}
                logoUrl={getFullImageUrl(previewConfig.logoUrl)}
                schoolName={schoolName}
            />
        );
    }

    return (
        <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
            {loggedInUser.role === 'customer' || loggedInUser.role === 'kunde' ? (
                <CustomerSidebar
                    user={loggedInUser}
                    onLogout={handleLogout}
                    setSidebarOpen={setIsSidebarOpen}
                    view={view}
                    setView={handleSetView}
                    schoolName={schoolName}
                    logoUrl={getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl)}
                    isPreviewMode={isPreviewMode}
                    onToggleRole={togglePreviewRole}
                    activeModules={activeModules}
                    unreadChatCount={unreadChatCount}
                    hasNewNews={hasNewNews}
                    onOpenNotifications={() => setNotificationSettingsOpen(true)}
                />
            ) : (
                <Sidebar
                    user={loggedInUser}
                    activePage={view.page}
                    setView={handleSetView}
                    onLogout={handleLogout}
                    setSidebarOpen={setIsSidebarOpen}
                    logoUrl={getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl)}
                    schoolName={schoolName}
                    isPreviewMode={isPreviewMode}
                    onToggleRole={togglePreviewRole}
                    activeModules={activeModules}
                    unreadChatCount={unreadChatCount}
                    hasNewNews={hasNewNews}
                    onOpenNotifications={() => setNotificationSettingsOpen(true)}
                />
            )
            }

            <main className={`main-content ${view.page === 'chat' ? 'chat-page-active' : ''}`}>
                {/* HIER DIE ÄNDERUNG: Genauere Bestimmung der aktuellen Seite für die Hilfe */}
                {view.page !== 'chat' && (
                    <ContextHelp
                        currentPage={view.subPage ? `${view.page}_${view.subPage}` : view.page}
                        userRole={loggedInUser?.role}
                        tenantSupportEmail={appConfigData?.tenant?.support_email}
                    />
                )}

                {isMobileView && (
                    <header className="mobile-header">
                        <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                            <Icon name="menu" />
                        </button>
                        <div className="mobile-header-logo">
                            {getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl) ? (
                                <img src={getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl) || ''} alt="Logo" className="logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            ) : (
                                <Icon name="paw" width={24} height={24} />
                            )}
                            <h2>{schoolName}</h2>
                        </div>
                    </header>
                )}
                {renderContent()}
            </main>

            {isMobileView && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            {modal.isOpen && (
                <InfoModal title={modal.title} color={modal.color} onClose={() => setModal({ ...modal, isOpen: false })}>
                    {modal.content}
                </InfoModal>
            )}

            {addCustomerModalOpen && (
                <AddCustomerModal onClose={() => setAddCustomerModalOpen(false)} onAddCustomer={handleAddCustomer} />
            )}

            {userModal.isOpen && (
                <UserFormModal user={userModal.user} onClose={() => setUserModal({ isOpen: false, user: null })} onSave={handleSaveUser} />
            )}

            {deleteUserModal && (
                <DeleteUserModal user={deleteUserModal} onClose={() => setDeleteUserModal(null)} onConfirm={handleDeleteUser} />
            )}

            {deletingDocument && (
                <DeleteDocumentModal document={deletingDocument} onClose={() => setDeletingDocument(null)} onConfirm={() => { handleDeleteDocument(deletingDocument.id); setDeletingDocument(null); }} />
            )}

            {dogFormModal.isOpen && (
                <DogFormModal
                    dog={dogFormModal.dog}
                    onClose={() => setDogFormModal({ isOpen: false, dog: null })}
                    onSave={(dogData) => handleSaveDog(dogData, view.customerId || loggedInUser.id)}
                />
            )}

            {deletingDog && (
                <DeleteDogModal dog={deletingDog} onClose={() => setDeletingDog(null)} onConfirm={() => { handleDeleteDog(deletingDog.id); setDeletingDog(null); }} />
            )}

            <NotificationSettingsModal
                isOpen={notificationSettingsOpen}
                onClose={() => setNotificationSettingsOpen(false)}
                token={authToken}
                user={loggedInUser}
                onRefresh={fetchAppData}
            />

            {isServerLoading.active && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'var(--card-background)', padding: '2rem', borderRadius: '1rem', textAlign: 'center' }}>
                        <LoadingSpinner message={isServerLoading.message} />
                        <p style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{isServerLoading.message}</p>
                    </div >
                </div >
            )}
            {/* MODIFIZIERT: Callback übergeben */}
            <CookieBanner onAccept={handleCookieAccept} />

            {/* MODIFIZIERT: installAllowed prop übergeben */}
            <PWAInstallPrompt
                primaryColor={appConfigData?.tenant?.config?.branding?.primary_color || '#22C55E'}
                installAllowed={cookieConsent}
            />
        </div >
    );
}
