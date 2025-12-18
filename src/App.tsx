
import React, { FC, useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { apiClient } from './lib/api';
import { User, UserRole, View, Customer, Transaction } from './types';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import Icon from './components/ui/Icon';
import { getContrastColor, getAdjustedColor, isDarkColor } from './lib/utils';
import Sidebar from './components/layout/Sidebar';
import CustomerSidebar from './components/layout/CustomerSidebar';
import AuthScreen from './components/auth/AuthScreen';

// Modals
import InfoModal from './components/modals/InfoModal';
import AddCustomerModal from './components/modals/AddCustomerModal';
import UserFormModal from './components/modals/UserFormModal';
import DeleteUserModal from './components/modals/DeleteUserModal';
import DeleteDocumentModal from './components/modals/DeleteDocumentModal';
import DogFormModal from './components/modals/DogFormModal';
import DeleteDogModal from './components/modals/DeleteDogModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import TransactionManagementPage from './pages/customers/TransactionManagementPage';
import CustomerTransactionsPage from './pages/customers/CustomerTransactionsPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/admin/UsersPage';

const getFullImageUrl = (url?: string) => {
    if (!url) return "/paw.png"; // Fallback
    if (url.startsWith("http")) return url;
    // API_BASE_URL aus deinem Environment oder Konstante
    return `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${url}`;
};

const App: FC = () => {
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [view, setView] = useState<View>({ page: 'dashboard' });
    const [customers, setCustomers] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({ isOpen: false, title: '', content: null, color: 'green' });
    const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 992);

    // User Management Modals State
    const [userModal, setUserModal] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [deleteUserModal, setDeleteUserModal] = useState<User | null>(null);

    const [deletingDocument, setDeletingDocument] = useState<any | null>(null);
    const [dogFormModal, setDogFormModal] = useState<{ isOpen: boolean; dog: any | null }>({ isOpen: false, dog: null });
    const [deletingDog, setDeletingDog] = useState<any | null>(null);

    const [isServerLoading, setServerLoading] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
    const [customerPage, setCustomerPage] = useState<'overview' | 'transactions'>('overview');
    const [directAccessedCustomer, setDirectAccessedCustomer] = useState<any | null>(null);

    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Config State for Preview / Customization
    const [schoolName, setSchoolName] = useState('PfotenCard');
    const [previewConfig, setPreviewConfig] = useState<{
        logoUrl?: string;
        viewMode: 'app' | 'login';
        levels?: any[];
        services?: any[];
        balance?: {
            allow_custom_top_up: boolean;
            top_up_options: { amount: number; bonus: number }[];
        };
    }>({ viewMode: 'app' });

    const [appConfigData, setAppConfigData] = useState<{
        schoolName: string;
        logoUrl: string;
        primaryColor: string;
        secondaryColor: string;
        backgroundColor: string;
        levels?: any[];
        services?: any[];
        balance?: {
            allow_custom_top_up: boolean;
            top_up_options: { amount: number; bonus: number }[];
        };
    } | null>(null);

    const isPreviewMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'preview', []);

    const togglePreviewRole = () => {
        if (!loggedInUser) return;

        // Rolle wechseln
        const newRole = loggedInUser.role === 'admin' ? 'customer' : 'admin';

        // User Objekt aktualisieren
        const updatedUser = {
            ...loggedInUser,
            role: newRole,
            // Optional: Name anpassen zur Verdeutlichung
            name: newRole === 'admin' ? 'Max Admin' : 'Max Mustermann'
        };

        setLoggedInUser(updatedUser as any);

        // WICHTIG: View zurücksetzen, damit man nicht auf einer Admin-Seite als Kunde landet (403 Fehler)
        setView({ page: 'dashboard' });
        setCustomerPage('overview'); // Reset Customer Page State
    };

    // NEU: Konfiguration beim Start laden
    useEffect(() => {
        const loadConfig = async () => {
            // Wenn wir im Preview-Modus (Iframe) sind, überspringen wir den Fetch,
            // da die Daten per postMessage kommen (siehe bestehender useEffect).
            const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview';
            if (isPreview) return;

            try {
                const config = await apiClient.getConfig();
                const tenant = config.tenant;
                const branding = tenant.config?.branding || {};

                // 1. Daten in State speichern
                const loadedConfig = {
                    schoolName: tenant.name,
                    logoUrl: branding.logo_url,
                    primaryColor: branding.primary_color || '#22C55E',
                    secondaryColor: branding.secondary_color || '#3B82F6',
                    backgroundColor: branding.background_color || '#F8FAFC',
                    levels: config.levels,
                    services: config.training_types,
                    balance: tenant.config?.balance
                };

                setAppConfigData(loadedConfig);
                setSchoolName(loadedConfig.schoolName); // Bestehenden State nutzen

                // 2. CSS Variablen setzen (Branding anwenden)
                const root = document.documentElement;

                if (loadedConfig.primaryColor) {
                    const primary = loadedConfig.primaryColor;
                    root.style.setProperty('--brand-green', primary);
                    root.style.setProperty('--sidebar-active-bg', primary);
                    root.style.setProperty('--button-primary-hover', getAdjustedColor(primary, -15));
                    root.style.setProperty('--primary-bg-light', isDarkColor(primary) ? 'rgba(255,255,255,0.1)' : getAdjustedColor(primary, 90));
                }
                if (loadedConfig.secondaryColor) {
                    const secondary = loadedConfig.secondaryColor;
                    root.style.setProperty('--brand-blue', secondary);
                    root.style.setProperty('--button-secondary-hover', getAdjustedColor(secondary, -15));
                    root.style.setProperty('--secondary-bg-light', isDarkColor(secondary) ? 'rgba(255,255,255,0.1)' : getAdjustedColor(secondary, 90));
                }

                // Additional Brand Accents (Adaptive)
                const orange = '#F97316';
                const purple = '#8B5CF6';
                const red = '#ef4444';
                root.style.setProperty('--brand-orange-light', isDarkColor(branding.background_color) ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED');
                root.style.setProperty('--brand-purple-light', isDarkColor(branding.background_color) ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF');
                root.style.setProperty('--brand-red-light', isDarkColor(branding.background_color) ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2');

                // Level colors adaptive backgrounds
                const levelColors = ['#DA70D6', '#32CD32', '#87CEEB', '#CD853F', '#FFD700'];
                levelColors.forEach((color, i) => {
                    root.style.setProperty(`--level-${i + 1}-color-bg`, isDarkColor(branding.background_color) ? 'rgba(255,255,255,0.03)' : getAdjustedColor(color, 90));
                });

                if (branding.background_color) {
                    const bgColor = branding.background_color;
                    const isDark = isDarkColor(bgColor);
                    const contrastColor = getContrastColor(bgColor);

                    root.style.setProperty('--background-color', bgColor);
                    root.style.setProperty('--text-primary', contrastColor);
                    root.style.setProperty('--card-background', isDark ? getAdjustedColor(bgColor, 5) : '#ffffff');
                    root.style.setProperty('--card-background-hover', isDark ? getAdjustedColor(bgColor, 10) : '#f9fafb');
                    root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
                    root.style.setProperty('--text-secondary', isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)');

                    // Sidebar Anpassung
                    if (isDark) {
                        root.style.setProperty('--sidebar-bg', getAdjustedColor(bgColor, -2));
                        root.style.setProperty('--sidebar-text', 'rgba(255,255,255,0.6)');
                        root.style.setProperty('--sidebar-text-hover', '#ffffff');
                        root.style.setProperty('--sidebar-hover-bg', 'rgba(255,255,255,0.05)');
                    } else {
                        root.style.setProperty('--sidebar-bg', getAdjustedColor(bgColor, -5));
                        root.style.setProperty('--sidebar-text', 'rgba(0,0,0,0.6)');
                        root.style.setProperty('--sidebar-text-hover', '#000000');
                        root.style.setProperty('--sidebar-hover-bg', 'rgba(0,0,0,0.05)');
                    }
                }

                // 3. Favicon dynamisch ändern (optional)
                if (loadedConfig.logoUrl) {
                    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                    if (link) {
                        // Falls URL relativ ist, Basis-URL davor hängen
                        const fullLogoUrl = loadedConfig.logoUrl.startsWith('http')
                            ? loadedConfig.logoUrl
                            : `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${loadedConfig.logoUrl}`;
                        link.href = fullLogoUrl;
                    }
                }

            } catch (error) {
                console.error("Fehler beim Laden der Konfiguration:", error);
                // Fallback: Default Branding behalten
            }
        };

        loadConfig();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 992;
            setIsMobileView(isMobile);
            if (!isMobile) {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (loggedInUser && loggedInUser.role !== 'customer' && loggedInUser.role !== 'kunde') {
            const path = window.location.pathname;
            const match = path.match(/customer\/(\d+)/);

            if (match && match[1]) {
                const customerId = parseInt(match[1]);
                setServerLoading({ active: true, message: 'Lade Kundendaten...' });
                apiClient.get(`/api/users/${customerId}`, authToken)
                    .then(customerData => {
                        setDirectAccessedCustomer(customerData);
                        setView({ page: 'customers', subPage: 'detail', customerId: String(customerId) });
                    })
                    .catch(err => {
                        console.error("Fehler beim Laden des Kunden via QR-Code:", err);
                        alert("Kunde konnte nicht gefunden oder geladen werden.");
                        window.history.pushState({}, '', '/');
                    })
                    .finally(() => {
                        setServerLoading({ active: false, message: '' });
                    });
            }
        }
    }, [loggedInUser, authToken]);

    useEffect(() => {
        // Skip auth listener in Preview Mode to prevent Supabase connection errors
        const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview';
        if (isPreview) return;

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setShowPasswordReset(true);
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    // --- PREVIEW MODE HANDLER ---
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'preview') {
            console.log("Preview Mode Active");

            const applyConfig = (payload: any) => {
                // ... (Config Logic bleibt gleich) ...
                console.log("Applying Preview Config:", payload);
                const root = document.documentElement;

                if (payload.primary_color) {
                    const primary = payload.primary_color;
                    root.style.setProperty('--brand-green', primary);
                    root.style.setProperty('--sidebar-active-bg', primary);
                    root.style.setProperty('--button-primary-hover', getAdjustedColor(primary, -15));
                    root.style.setProperty('--primary-bg-light', isDarkColor(primary) ? 'rgba(255,255,255,0.1)' : getAdjustedColor(primary, 90));
                }
                if (payload.secondary_color) {
                    const secondary = payload.secondary_color;
                    root.style.setProperty('--brand-blue', secondary);
                    root.style.setProperty('--button-secondary-hover', getAdjustedColor(secondary, -15));
                    root.style.setProperty('--secondary-bg-light', isDarkColor(secondary) ? 'rgba(255,255,255,0.1)' : getAdjustedColor(secondary, 90));
                }

                // Additional Brand Accents (Adaptive)
                root.style.setProperty('--brand-orange-light', isDarkColor(payload.background_color) ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED');
                root.style.setProperty('--brand-purple-light', isDarkColor(payload.background_color) ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF');
                root.style.setProperty('--brand-red-light', isDarkColor(payload.background_color) ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2');

                // Level colors adaptive backgrounds
                const levelColorsPreview = ['#DA70D6', '#32CD32', '#87CEEB', '#CD853F', '#FFD700'];
                levelColorsPreview.forEach((color, i) => {
                    root.style.setProperty(`--level-${i + 1}-color-bg`, isDarkColor(payload.background_color) ? 'rgba(255,255,255,0.03)' : getAdjustedColor(color, 90));
                });

                if (payload.background_color) {
                    const bgColor = payload.background_color;
                    const isDark = isDarkColor(bgColor);
                    const contrastColor = getContrastColor(bgColor);

                    root.style.setProperty('--background-color', bgColor);
                    root.style.setProperty('--text-primary', contrastColor);
                    root.style.setProperty('--card-background', isDark ? getAdjustedColor(bgColor, 5) : '#ffffff');
                    root.style.setProperty('--card-background-hover', isDark ? getAdjustedColor(bgColor, 10) : '#f9fafb');
                    root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
                    root.style.setProperty('--text-secondary', isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)');

                    if (isDark) {
                        root.style.setProperty('--sidebar-bg', getAdjustedColor(bgColor, -2));
                        root.style.setProperty('--sidebar-text', 'rgba(255,255,255,0.6)');
                        root.style.setProperty('--sidebar-text-hover', '#ffffff');
                        root.style.setProperty('--sidebar-hover-bg', 'rgba(255,255,255,0.05)');
                    } else {
                        root.style.setProperty('--sidebar-bg', getAdjustedColor(bgColor, -5));
                        root.style.setProperty('--sidebar-text', 'rgba(0,0,0,0.6)');
                        root.style.setProperty('--sidebar-text-hover', '#000000');
                        root.style.setProperty('--sidebar-hover-bg', 'rgba(0,0,0,0.05)');
                    }
                }

                if (payload.school_name) setSchoolName(payload.school_name);

                setPreviewConfig(prev => ({
                    ...prev,
                    logoUrl: payload.logo || prev.logoUrl,
                    levels: payload.levels || prev.levels,
                    services: payload.services || prev.services,
                    viewMode: payload.view_mode || prev.viewMode,
                    balance: payload.balance || prev.balance
                }));

                if (payload.role) {
                    // Update current logged in user role based on toggle
                    setLoggedInUser(prev => prev ? { ...prev, role: payload.role } : null);
                }
            };

            // --- 1. MOCK DATEN DEFINITION ---

            // Der Kunde (Max)
            const mockUserCustomer: User = {
                id: 'preview-user',
                name: 'Max Mustermann',
                email: 'max@beispiel.de',
                role: 'customer', // Standard-Startrolle
                createdAt: new Date('2024-01-01'),
            };

            // Der Admin (für die Benutzerliste)
            const mockUserAdmin: User = {
                id: 'preview-admin',
                name: 'Anna Admin',
                email: 'admin@hundeschule.de',
                role: 'admin',
                createdAt: new Date('2023-01-01'),
            };

            // Das Kunden-Objekt mit Guthaben und Hunden
            const mockCustomerData = {
                ...mockUserCustomer, // Erbt ID, Name etc.
                balance: 150.00, // 150€ Aufladung + 30€ Bonus - 30€ Training = 150€
                level_id: 2, // Level 1 abgeschlossen -> In Level 2
                dogs: [
                    { name: 'Bello', breed: 'Golden Retriever', birth_date: '2022-05-10', chip: '123456789' }
                ],
                is_vip: false,
                is_expert: false,
                customer_since: new Date('2024-01-15'),
                // HIER: Achievements für den Fortschritt in Level 2 (2x Gruppenstunde)
                achievements: [
                    { requirement_id: 'group_class', date_achieved: new Date(Date.now() - 86400000 * 2), is_consumed: false },
                    { requirement_id: 'group_class', date_achieved: new Date(Date.now() - 86400000), is_consumed: false }
                ]
            };

            // Passende Transaktionen
            const mockTransactions = [
                {
                    id: 'tx-3',
                    user_id: 'preview-user',
                    booked_by_id: 'preview-admin',
                    amount: -15, // Preis für Gruppenstunde
                    title: 'Gruppenstunde',
                    description: 'Gruppenstunde',
                    date: new Date().toISOString(), // Heute
                    type: 'debit'
                },
                {
                    id: 'tx-2',
                    user_id: 'preview-user',
                    booked_by_id: 'preview-admin',
                    amount: -15, // Preis für Gruppenstunde
                    title: 'Gruppenstunde',
                    description: 'Gruppenstunde',
                    date: new Date(Date.now() - 86400000).toISOString(), // Gestern
                    type: 'debit'
                },
                {
                    id: 'tx-1',
                    user_id: 'preview-user',
                    booked_by_id: 'preview-admin',
                    amount: 180, // 150€ + 30€ Bonus
                    title: 'Aufladung 150€',
                    description: 'Aufladung inkl. Bonus',
                    date: new Date(Date.now() - 86400000 * 7).toISOString(), // Vor einer Woche
                    type: 'topup'
                }
            ];

            // --- STATE SETZEN ---
            setLoggedInUser(mockUserCustomer);
            setCustomers([mockCustomerData]);
            setUsers([mockUserCustomer, mockUserAdmin]); // Jetzt sind beide in der Liste
            setTransactions(mockTransactions);

            setAuthToken('preview-mode-token');
            setIsLoading(false);

            // 2. Check for Hash Config (Persistence)
            if (window.location.hash) {
                try {
                    const hashConfig = window.location.hash.substring(1);
                    if (hashConfig.startsWith('config=')) {
                        const encoded = hashConfig.replace('config=', '');
                        const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
                        applyConfig(decoded);
                    }
                } catch (e) {
                    console.error("Failed to parse config from hash", e);
                }
            }

            // 3. Listen for Config Updates
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'UPDATE_CONFIG') {
                    applyConfig(event.data.payload);
                }
            };

            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }
    }, []);

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
        if (view.customerId && newView.customerId !== view.customerId) {
            setDirectAccessedCustomer(null);
            window.history.pushState({}, '', '/');
        }
        setView(newView);
    };

    const fetchAppData = async () => {
        // Skip fetch in Preview Mode
        if (new URLSearchParams(window.location.search).get('mode') === 'preview') {
            return;
        }

        if (!authToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const currentUser = await apiClient.get('/api/users/me', authToken);
            setLoggedInUser(currentUser);

            if (currentUser.role === 'customer' || currentUser.role === 'kunde') {
                const transactionsResponse = await apiClient.get('/api/transactions', authToken);
                setTransactions(transactionsResponse);
                setCustomers([currentUser]);
                setUsers([currentUser]);
            } else {
                const [usersResponse, transactionsResponse] = await Promise.all([
                    apiClient.get('/api/users', authToken),
                    apiClient.get('/api/transactions', authToken)
                ]);
                setCustomers(usersResponse.filter((user: any) => user.role === 'customer' || user.role === 'kunde'));
                setUsers(usersResponse);
                setTransactions(transactionsResponse);
            }

        } catch (error) {
            console.error("Authentifizierung oder Datenabruf fehlgeschlagen, logge aus:", error);
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppData();
    }, [authToken]);

    const handleLoginSuccess = (token: string, user: any) => {
        localStorage.setItem('authToken', token);
        setAuthToken(token);
        setLoggedInUser(user);
        setServerLoading({ active: false, message: '' });
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setLoggedInUser(null);
        setDirectAccessedCustomer(null);
        window.history.pushState({}, '', '/');
    };

    const handleConfirmTransaction = async (txData: {
        title: string;
        amount: number;
        type: 'topup' | 'debit';
        meta?: { requirementId?: string };
        baseAmount?: number;
    }) => {
        // --- PREVIEW MODE SIMULATION ---
        if (isPreviewMode) {
            const newTx = {
                id: `tx-preview-${Date.now()}`,
                user_id: view.customerId, // ID als String lassen
                type: txData.type === 'topup' ? 'Aufladung' : txData.title,
                description: txData.title,
                amount: txData.amount, // Im Preview vereinfacht: Betrag = Änderung
                date: new Date().toISOString(),
                booked_by_id: loggedInUser?.id
            };

            // 1. Transaktion hinzufügen
            setTransactions(prev => [newTx, ...prev]);

            // 2. Kunden-Guthaben aktualisieren
            setCustomers(prev => prev.map(c => {
                if (String(c.id) === view.customerId) {
                    return { ...c, balance: c.balance + txData.amount };
                }
                return c;
            }));

            // 3. User State aktualisieren falls wir selbst der Kunde sind
            if (loggedInUser?.id === view.customerId) {
                // @ts-ignore
                setLoggedInUser(prev => ({ ...prev, balance: (prev.balance || 0) + txData.amount }));
            }

            console.log('Preview-Transaktion erfolgreich simuliert!');
            return;
        }
        // --- ENDE PREVIEW SIMULATION ---

        if (!view.customerId || !authToken) return;

        // ... (Original Code für Backend-Call) ...
        const transactionPayload = {
            // FIX: Robusteres Parsing für IDs
            user_id: parseInt(view.customerId.replace('cust-', ''), 10) || 0,
            type: txData.type === 'topup' ? 'Aufladung' : txData.title,
            description: txData.title,
            amount: txData.baseAmount || txData.amount,
            requirement_id: txData.meta?.requirementId || null
        };

        try {
            await apiClient.post('/api/transactions', transactionPayload, authToken);
            console.log('Transaktion erfolgreich gebucht!');
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Buchen der Transaktion:", error);
            alert(`Fehler: ${error}`);
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

    const handleLevelUp = async (customerId: string, newLevelId: number) => {
        try {
            await apiClient.put(`/api/users/${customerId}/level`, { level_id: newLevelId }, authToken);
            console.log(`Kunde erfolgreich auf Level ${newLevelId} hochgestuft!`);
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Level-Up:", error);
            alert(`Fehler: ${error}`);
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
            } catch (error) {
                console.error("Fehler beim Löschen des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
            setDeleteUserModal(null);
        }
    };

    const handleSaveCustomerDetails = async (userToUpdate: any, dogToUpdate: any) => {
        if (isPreviewMode) {
            setCustomers(prev => prev.map(c => {
                if (c.id === userToUpdate.id) {
                    const updatedC = { ...c, ...userToUpdate };
                    // Update Dog if present
                    if (dogToUpdate) {
                        updatedC.dogs = [dogToUpdate];
                    }
                    return updatedC;
                }
                return c;
            }));
            console.log('Preview-Daten erfolgreich lokal gespeichert!');
            return;
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
                };

                if (dogToUpdate.id) {
                    await apiClient.put(`/api/dogs/${dogToUpdate.id}`, cleanDogData, authToken);
                    console.log('Hund aktualisiert');
                } else {
                    await apiClient.post(`/api/users/${userToUpdate.id}/dogs`, cleanDogData, authToken);
                    console.log('Neuer Hund angelegt');
                }
            }

            await fetchAppData();
            console.log('Daten erfolgreich gespeichert!');

        } catch (error) {
            console.error("Fehler beim Speichern der Details:", error);
            alert(`Ein Fehler ist aufgetreten: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        }
    };

    const handleSaveDog = async (dogData: any) => {
        const customerId = view.customerId;
        if (!customerId) return;

        const cleanDogData = {
            ...dogData,
            birth_date: dogData.birth_date || null,
            breed: dogData.breed || null,
            chip: dogData.chip || null
        };

        try {
            if (dogData.id) {
                await apiClient.put(`/api/dogs/${dogData.id}`, cleanDogData, authToken);
            } else {
                await apiClient.post(`/api/users/${customerId}/dogs`, cleanDogData, authToken);
            }
            await fetchAppData();
            console.log("Hundedaten erfolgreich gespeichert.");
        } catch (error) {
            console.error("Fehler beim Speichern des Hundes:", error);
            alert("Fehler beim Speichern: " + (error instanceof Error ? error.message : "Unbekannter Fehler"));
        }
    };

    const handleConfirmDeleteDog = async () => {
        if (!deletingDog) return;
        try {
            await apiClient.delete(`/api/dogs/${deletingDog.id}`, authToken);
            await fetchAppData();
            console.log("Hund erfolgreich gelöscht.");
        } catch (error) {
            console.error("Fehler beim Löschen des Hundes:", error);
        }
        setDeletingDog(null);
    };

    const onUploadDocuments = async (files: File[], customerId: string) => {
        setServerLoading({ active: true, message: 'Lade Dokumente hoch...' });

        try {
            for (const file of Array.from(files)) {
                await apiClient.upload(`/api/users/${customerId}/documents`, file, authToken);
            }
            console.log(`${files.length} Dokument(e) erfolgreich hochgeladen.`);
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Dokumenten-Upload:", error);
            alert(`Fehler beim Upload: ${error}`);
        } finally {
            setServerLoading({ active: false, message: '' });
        }
    };

    const handleConfirmDeleteDocument = async () => {
        if (!deletingDocument) return;
        try {
            await apiClient.delete(`/api/documents/${deletingDocument.id}`, authToken);
            console.log("Dokument erfolgreich gelöscht.");
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Löschen des Dokuments:", error);
        }
        setDeletingDocument(null);
    };

    const handleKpiClick = (type: string, color: string, data: { customers: any[]; transactions: any[] }) => {
        let title = '';
        let content: React.ReactNode = null;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = now.toDateString();

        const renderCustomerList = (customerList: any[]) => (
            <ul className="info-modal-list">
                {customerList.map(c => {
                    const nameParts = c.name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ');
                    const dogName = c.dogs && c.dogs.length > 0 ? c.dogs[0].name : '-';

                    return (
                        <li key={c.id}>
                            <span>{firstName} {lastName} ({dogName})</span>
                            <span>€ {Math.floor(c.balance).toLocaleString('de-DE')}</span>
                        </li>
                    );
                })}
            </ul>
        );
        const renderTransactionList = (txList: any[]) => (
            <ul className="info-modal-list">
                {txList.map(t => {
                    const cust = data.customers.find(c => c.id === t.user_id);
                    return <li key={t.id}><span>{t.description} - {cust?.name}</span> <span>€ {Math.floor(t.amount).toLocaleString('de-DE')}</span></li>
                })}
            </ul>
        );

        switch (type) {
            case 'allCustomers':
                title = 'Alle Kunden';
                content = renderCustomerList(data.customers);
                break;
            case 'customersWithBalance':
                title = 'Kunden mit Guthaben';
                content = renderCustomerList(data.customers.filter(c => c.balance > 0));
                break;
            case 'transactionsToday':
                title = 'Heutige Transaktionen';
                content = renderTransactionList(data.transactions.filter(t => new Date(t.date).toDateString() === today));
                break;
            case 'transactionsMonth':
                title = 'Transaktionen im Monat';
                content = renderTransactionList(data.transactions.filter(t => new Date(t.date) >= startOfMonth));
                break;
            case 'activeCustomersMonth':
                title = 'Aktive Kunden im Monat';
                const activeCustomerIds = new Set(data.transactions.filter(tx => new Date(tx.date) >= startOfMonth).map(tx => tx.user_id));
                content = renderCustomerList(data.customers.filter(c => activeCustomerIds.has(c.id)));
                break;
        }
        setModal({ isOpen: true, title, content, color });
    };

    const { visibleCustomers, visibleTransactions } = useMemo(() => {
        if (loggedInUser?.role === 'admin') {
            return { visibleCustomers: customers, visibleTransactions: transactions };
        }

        if (loggedInUser?.role === 'mitarbeiter') {
            const staffTransactions = transactions.filter(tx => tx.booked_by_id === loggedInUser.id);
            const customerIdsInPortfolio = new Set(staffTransactions.map(tx => tx.user_id));
            const portfolioCustomers = customers.filter(c => customerIdsInPortfolio.has(c.id));
            return { visibleCustomers: portfolioCustomers, visibleTransactions: staffTransactions };
        }

        if (loggedInUser?.role === 'customer' || loggedInUser?.role === 'kunde') {
            return { visibleCustomers: customers, visibleTransactions: transactions };
        }

        return { visibleCustomers: [], visibleTransactions: [] };

    }, [loggedInUser, customers, transactions]);

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Lade App...</div>;
    }

    if (!authToken || !loggedInUser) {
        return (
            <>
                {isServerLoading.active && <LoadingSpinner message={isServerLoading.message} />}
                <AuthScreen
                    onLoginStart={() => setServerLoading({ active: true, message: 'Verbinde mit Server...' })}
                    onLoginEnd={() => setServerLoading({ active: false, message: '' })}
                    onLoginSuccess={handleLoginSuccess}
                    logoUrl={getFullImageUrl(appConfigData?.logoUrl || previewConfig.logoUrl)}
                    schoolName={appConfigData?.schoolName || schoolName}
                />

                {showPasswordReset && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header blue"><h2>Neues Passwort vergeben</h2></div>
                            <div className="modal-body">
                                <p>Geben Sie hier Ihr neues Passwort ein.</p>
                                <div className="form-group">
                                    <label>Neues Passwort</label>
                                    <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="button button-primary" onClick={handlePasswordUpdate}>Speichern</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (previewConfig.viewMode === 'login') {
        return (
            <AuthScreen
                onLoginStart={() => { }}
                onLoginEnd={() => { }}
                onLoginSuccess={(token) => {
                    // In view-only mode, we might just switch back to app ?
                    // For now, let's just make it switch to app view
                    setPreviewConfig(prev => ({ ...prev, viewMode: 'app' }));
                }}
                logoUrl={getFullImageUrl(appConfigData?.logoUrl || previewConfig.logoUrl)}
                schoolName={appConfigData?.schoolName || schoolName}
            />
        );
    }

    if (loggedInUser.role === 'customer' || loggedInUser.role === 'kunde') {
        const customer = customers.find(c => c.id === loggedInUser.id);

        if (customer) {
            return (
                <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
                    <CustomerSidebar
                        user={loggedInUser}
                        onLogout={handleLogout}
                        setSidebarOpen={setIsSidebarOpen}
                        activePage={customerPage}
                        setPage={setCustomerPage}
                        schoolName={appConfigData?.schoolName || schoolName}
                        logoUrl={getFullImageUrl(appConfigData?.logoUrl || previewConfig.logoUrl)}
                        isPreviewMode={isPreviewMode}
                        onToggleRole={togglePreviewRole}
                    />

                    <main className="main-content">
                        {isMobileView && (
                            <header className="mobile-header">
                                <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                                    <Icon name="menu" />
                                </button>
                                <div className="mobile-header-logo">
                                    <img src={getFullImageUrl(appConfigData?.logoUrl || previewConfig.logoUrl)} alt="PfotenCard Logo" className="logo" style={{ width: '32px', height: '32px' }} />
                                    <h2>{appConfigData?.schoolName || schoolName}</h2>
                                </div>
                            </header>
                        )}

                        {customerPage === 'overview' ? (
                            <CustomerDetailPage
                                customer={customer}
                                transactions={transactions}
                                setView={handleSetView}
                                handleLevelUp={handleLevelUp}
                                onSave={handleSaveCustomerDetails}
                                onToggleVipStatus={onToggleVipStatus}
                                onToggleExpertStatus={onToggleExpertStatus}
                                currentUser={loggedInUser}
                                users={users}
                                onUploadDocuments={(files) => onUploadDocuments(files, String(customer.id))}
                                onDeleteDocument={setDeletingDocument}
                                fetchAppData={fetchAppData}
                                authToken={authToken}
                                onDeleteUserClick={setDeleteUserModal}
                                setDogFormModal={setDogFormModal}
                                setDeletingDog={setDeletingDog}
                                levels={appConfigData?.levels || previewConfig.levels}
                            />
                        ) : (
                            <CustomerTransactionsPage transactions={transactions} />
                        )}
                    </main>
                    {isMobileView && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
                </div>
            );
        }
        return <div>Kundenprofil konnte nicht geladen werden. Bitte neu anmelden.</div>;
    }

    const renderContent = () => {
        const kpiClickHandler = (type: string, color: string) => handleKpiClick(type, color, { customers: visibleCustomers, transactions: visibleTransactions });

        if (view.page === 'customers' && view.subPage === 'detail' && view.customerId) {
            const customer = (directAccessedCustomer && String(directAccessedCustomer.id) === view.customerId)
                ? directAccessedCustomer
                : visibleCustomers.find(c => String(c.id) === view.customerId);

            if (customer) return <CustomerDetailPage
                customer={customer}
                transactions={transactions}
                setView={handleSetView}
                handleLevelUp={handleLevelUp}
                onSave={handleSaveCustomerDetails}
                fetchAppData={fetchAppData}
                currentUser={loggedInUser}
                users={users}
                onUploadDocuments={(files) => onUploadDocuments(files, String(customer.id))}
                onDeleteDocument={setDeletingDocument}
                authToken={authToken}
                onDeleteUserClick={setDeleteUserModal}
                onToggleVipStatus={onToggleVipStatus}
                onToggleExpertStatus={onToggleExpertStatus}
                setDogFormModal={setDogFormModal}
                setDeletingDog={setDeletingDog}
                levels={appConfigData?.levels || previewConfig.levels}
            />;
        }
        if (view.page === 'customers' && view.subPage === 'transactions' && view.customerId) {
            const customer = (directAccessedCustomer && String(directAccessedCustomer.id) === view.customerId)
                ? directAccessedCustomer
                : visibleCustomers.find(c => String(c.id) === view.customerId);

            if (customer) {
                return <TransactionManagementPage
                    customer={customer}
                    setView={handleSetView}
                    onConfirmTransaction={handleConfirmTransaction}
                    currentUser={loggedInUser}
                    services={appConfigData?.services || previewConfig.services}
                    balanceConfig={appConfigData?.balance || previewConfig.balance}
                />;
            }

            console.error("Fehler: Kunde für die Transaktionsverwaltung konnte nicht gefunden werden.");
            setView({ page: 'dashboard' });
            return null;
        }

        switch (view.page) {
            case 'customers':
                return <CustomerListPage
                    customers={visibleCustomers}
                    transactions={visibleTransactions}
                    setView={handleSetView}
                    onKpiClick={kpiClickHandler}
                    onAddCustomerClick={() => setAddCustomerModalOpen(true)}
                    currentUser={loggedInUser}
                />;
            case 'reports':
                return <ReportsPage
                    transactions={visibleTransactions}
                    customers={visibleCustomers}
                    users={users}
                    currentUser={loggedInUser}
                />;
            case 'users':
                return loggedInUser.role === 'admin'
                    ? <UsersPage
                        users={users}
                        onAddUserClick={() => setUserModal({ isOpen: true, user: null })}
                        onEditUserClick={(user) => setUserModal({ isOpen: true, user })}
                        onDeleteUserClick={(user) => setDeleteUserModal(user)}
                    />
                    : <DashboardPage
                        customers={visibleCustomers}
                        transactions={visibleTransactions}
                        currentUser={loggedInUser}
                        onKpiClick={kpiClickHandler}
                        setView={handleSetView}
                    />;
            case 'dashboard':
            default:
                return <DashboardPage
                    customers={visibleCustomers}
                    transactions={visibleTransactions}
                    currentUser={loggedInUser}
                    onKpiClick={kpiClickHandler}
                    setView={handleSetView}
                />;
        }
    };

    return (
        <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
            {isServerLoading.active && <LoadingSpinner message={isServerLoading.message} />}
            <Sidebar
                user={loggedInUser}
                activePage={view.page}
                setView={handleSetView}
                onLogout={() => setLoggedInUser(null)}
                setSidebarOpen={setIsSidebarOpen}
                logoUrl={getFullImageUrl(appConfigData?.logoUrl || previewConfig.logoUrl)}
                schoolName={appConfigData?.schoolName || schoolName}
                isPreviewMode={isPreviewMode}
                onToggleRole={togglePreviewRole}
            />
            <main className="main-content">
                {isMobileView && (
                    <header className="mobile-header">
                        <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                            <Icon name="menu" />
                        </button>
                        <div className="mobile-header-logo">
                            <img src={getFullImageUrl(appConfigData?.logoUrl || previewConfig.logoUrl)} alt="PfotenCard Logo" className="logo" width="32" height="32" />
                            <h2>{appConfigData?.schoolName || schoolName}</h2>
                        </div>
                    </header>
                )}
                {renderContent()}
            </main>
            {isMobileView && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
            {modal.isOpen && <InfoModal title={modal.title} color={modal.color} onClose={() => setModal({ isOpen: false, title: '', content: null, color: 'green' })}>{modal.content}</InfoModal>}
            {addCustomerModalOpen && <AddCustomerModal onClose={() => setAddCustomerModalOpen(false)} onAddCustomer={handleAddCustomer} />}

            {userModal.isOpen && <UserFormModal user={userModal.user} onClose={() => setUserModal({ isOpen: false, user: null })} onSave={handleSaveUser} />}
            {deleteUserModal && <DeleteUserModal user={deleteUserModal} onClose={() => setDeleteUserModal(null)} onConfirm={handleDeleteUser} />}
            {deletingDocument && <DeleteDocumentModal document={deletingDocument} onClose={() => setDeletingDocument(null)} onConfirm={handleConfirmDeleteDocument} />}
            {dogFormModal.isOpen && <DogFormModal dog={dogFormModal.dog} onClose={() => setDogFormModal({ isOpen: false, dog: null })} onSave={handleSaveDog} />}
            {deletingDog && <DeleteDogModal dog={deletingDog} onClose={() => setDeletingDog(null)} onConfirm={handleConfirmDeleteDog} />}

            {showPasswordReset && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header blue"><h2>Neues Passwort vergeben</h2></div>
                        <div className="modal-body">
                            <p>Geben Sie hier Ihr neues Passwort ein.</p>
                            <div className="form-group">
                                <label>Neues Passwort</label>
                                <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="button button-primary" onClick={handlePasswordUpdate}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
