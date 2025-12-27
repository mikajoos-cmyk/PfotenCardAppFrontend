import React, { FC, useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { apiClient } from './lib/api';
import { User, View } from './types';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import Icon from './components/ui/Icon';
import { isDarkColor, getAdjustedColor, getContrastColor } from './lib/utils';
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
import AppointmentsPage from './pages/AppointmentsPage';

const getFullImageUrl = (url?: string) => {
    if (!url) return "/paw.png";
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${url}`;
};

const App: FC = () => {
    const [loggedInUser, setLoggedInUser] = useState<any | null>(null);
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

    // Modals State
    const [userModal, setUserModal] = useState<{ isOpen: boolean; user: any | null }>({ isOpen: false, user: null });
    const [deleteUserModal, setDeleteUserModal] = useState<any | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<any | null>(null);
    const [dogFormModal, setDogFormModal] = useState<{ isOpen: boolean; dog: any | null }>({ isOpen: false, dog: null });
    const [deletingDog, setDeletingDog] = useState<any | null>(null);

    const [isServerLoading, setServerLoading] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
    // State for customer view sub-navigation
    const [customerPage, setCustomerPage] = useState<'overview' | 'transactions' | 'appointments'>('overview');
    const [directAccessedCustomer, setDirectAccessedCustomer] = useState<any | null>(null);

    const [showPasswordReset, setShowPasswordReset] = useState(false);
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
    }>({ viewMode: 'app' });

    const [appConfigData, setAppConfigData] = useState<any>(null);

    const isPreviewMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'preview', []);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const togglePreviewRole = () => {
        if (!loggedInUser) return;
        const newRole = loggedInUser.role === 'admin' ? 'customer' : 'admin';
        const updatedUser = {
            ...loggedInUser,
            role: newRole,
            name: newRole === 'admin' ? 'Max Admin' : 'Max Mustermann'
        };
        setLoggedInUser(updatedUser);
        setView({ page: 'dashboard' });
        setCustomerPage('overview');
    };

    // --- ZENTRALE THEME ENGINE ---
    const applyTheme = (config: any) => {
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

                        applyTheme(decoded); // Hier werden auch die Farben gesetzt
                        setSchoolName(decoded.school_name || 'PfotenCard');
                        setPreviewConfig(prev => ({
                            ...prev,
                            logoUrl: decoded.logo,
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
                applyTheme({ branding: config.tenant?.config?.branding || {} });
            } catch (error) {
                console.error("Config Load Error", error);
            }
        };

        loadConfig();

        // Preview Listener (Echtzeit-Updates)
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'UPDATE_CONFIG') {
                const payload = event.data.payload;
                applyTheme(payload); // WICHTIG: Dies setzt setIsDarkMode basierend auf der Payload
                setSchoolName(payload.school_name || 'PfotenCard');

                setPreviewConfig(prev => ({
                    ...prev,
                    logoUrl: payload.logo,
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
                id: 'preview-user',
                name: 'Max Mustermann',
                email: 'max@beispiel.de',
                role: 'customer',
                createdAt: new Date()
            };
            const mockUserAdmin: User = {
                id: 'preview-admin',
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

            const mockTransactions = [
                { id: 'tx-1', user_id: 'preview-user', amount: 150, title: 'Aufladung', date: new Date().toISOString(), type: 'topup', booked_by_id: 'preview-admin' }
            ];

            setLoggedInUser(mockUserCustomer);
            setCustomers([mockCustomerData]);
            setUsers([mockUserCustomer, mockUserAdmin]);
            setTransactions(mockTransactions);
            setAuthToken('preview-token');
            setIsLoading(false);
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
        const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview';
        if (isPreview) return;

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setShowPasswordReset(true);
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
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

            setTransactions(prev => [newTx, ...prev]);
            setCustomers(prev => prev.map(c => {
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

        const transactionPayload = {
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
            console.log('Kundendaten erfolgreich gespeichert!');
        } catch (error) {
            console.error("Fehler beim Speichern der Kundendaten:", error);
            alert(`Fehler: ${error}`);
        }
    };
    const handleUploadDocuments = async (files: File[], customerId: string) => {
        if (!authToken) return;

        // Lade-Spinner anzeigen (optional, falls du einen State dafür hast)
        // setServerLoading({ active: true, message: 'Lade Dokumente hoch...' });

        try {
            // WICHTIG: Das Backend erwartet Einzel-Uploads mit dem Feldnamen 'upload_file'
            for (const file of files) {
                const formData = new FormData();
                // Der Key muss exakt 'upload_file' heißen, passend zu main.py: upload_file: UploadFile = File(...)
                formData.append('upload_file', file);

                // Wir warten auf jeden Upload einzeln
                await apiClient.uploadDocuments(customerId, formData, authToken);
            }

            await fetchAppData();
            console.log('Dokumente erfolgreich hochgeladen!');
        } catch (error) {
            console.error("Fehler beim Hochladen der Dokumente:", error);
            // Bei [object Object] Fehlern ist es oft hilfreich, das Objekt in der Konsole zu inspecten oder error.message zu nutzen
            const errorMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
            alert(`Fehler beim Upload: ${errorMsg}`);
        } finally {
            // Spinner ausblenden
            setServerLoading({ active: false, message: '' });
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
            alert(`Fehler: ${error}`);
        }
    };

    const handleSaveDog = async (dogData: any, customerId: string) => {
        if (!authToken) return;

        try {
            if (dogData.id) {
                await apiClient.put(`/api/dogs/${dogData.id}`, dogData, authToken);
            } else {
                await apiClient.post(`/api/users/${customerId}/dogs`, dogData, authToken);
            }
            await fetchAppData();
            console.log('Hund erfolgreich gespeichert!');
        } catch (error) {
            console.error("Fehler beim Speichern des Hundes:", error);
            alert(`Fehler: ${error}`);
        }
        setDogFormModal({ isOpen: false, dog: null });
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
                    <div className="form-group">
                        <label>Neues Passwort</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <button className="button button-primary" onClick={handlePasswordUpdate}>Passwort ändern</button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--background-color)' }}>
                <LoadingSpinner message="Lade App..." />
            </div >
        );
    }

    if (!authToken || !loggedInUser) {
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

    const renderContent = () => {
        if (loggedInUser.role === 'customer' || loggedInUser.role === 'kunde') {
            const customer = customers.find(c => c.id === loggedInUser.id) || (isPreviewMode ? loggedInUser : null);
            if (!customer) return <div>Lade Daten...</div>;

            if (customerPage === 'transactions') {
                return <CustomerTransactionsPage transactions={transactions.filter(t => t.user_id === loggedInUser.id)} />;
            }

            if (customerPage === 'appointments') {
                return <AppointmentsPage user={loggedInUser} token={authToken} />;
            }

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
                />
            );
        }

        if (view.page === 'dashboard') {
            return (
                <DashboardPage
                    customers={customers}
                    transactions={transactions}
                    currentUser={loggedInUser}
                    onKpiClick={(kpi) => {
                        if (kpi === 'customers') setView({ page: 'customers' });
                    }}
                    setView={handleSetView}
                />
            );
        }

        if (view.page === 'customers') {
            if (view.subPage === 'detail' && view.customerId) {
                const customer = directAccessedCustomer || customers.find(c => String(c.id) === view.customerId);
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
                    />
                );
            }

            if (view.subPage === 'transactions' && view.customerId) {
                const customer = customers.find(c => String(c.id) === view.customerId);
                if (!customer) return <div>Kunde nicht gefunden</div>;

                return (
                    <TransactionManagementPage
                        customer={customer}
                        onConfirmTransaction={handleConfirmTransaction}
                        setView={handleSetView}
                        currentUser={loggedInUser}
                        services={appConfigData?.training_types || previewConfig.services || []}
                        balanceConfig={appConfigData?.tenant?.config?.balance || previewConfig.balance}
                    />
                );
            }

            return (
                <CustomerListPage
                    customers={customers}
                    transactions={transactions}
                    setView={handleSetView}
                    onKpiClick={(kpi) => { }}
                    onAddCustomerClick={() => setAddCustomerModalOpen(true)}
                    currentUser={loggedInUser}
                />
            );
        }

        if (view.page === 'reports') {
            return <ReportsPage transactions={transactions} customers={customers} users={users} currentUser={loggedInUser} />;
        }

        if (view.page === 'appointments') {
            return (
                <AppointmentsPage user={loggedInUser} token={authToken} />
            );
        }

        if (view.page === 'users') {
            return (
                <UsersPage
                    users={users}
                    onAddUserClick={() => setUserModal({ isOpen: true, user: null })}
                    onEditUserClick={(user) => setUserModal({ isOpen: true, user })}
                    onDeleteUserClick={(user) => setDeleteUserModal(user)}
                />
            );
        }

        return <div>Seite nicht gefunden</div>;
    };

    const activeModules = appConfigData?.tenant?.config?.active_modules || previewConfig.activeModules || ['news', 'documents', 'calendar'];

    return (
        <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
            {loggedInUser.role === 'customer' || loggedInUser.role === 'kunde' ? (
                <CustomerSidebar
                    user={loggedInUser}
                    onLogout={handleLogout}
                    setSidebarOpen={setIsSidebarOpen}
                    activePage={customerPage}
                    setPage={setCustomerPage}
                    schoolName={schoolName}
                    logoUrl={getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl)}
                    isPreviewMode={isPreviewMode}
                    onToggleRole={togglePreviewRole}
                    activeModules={activeModules}
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
                />
            )}

            <main className="main-content">
                {isMobileView && (
                    <header className="mobile-header">
                        <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                            <Icon name="menu" />
                        </button>
                        <div className="mobile-header-logo">
                            <img src={getFullImageUrl(appConfigData?.tenant?.config?.branding?.logo_url || previewConfig.logoUrl)} alt="Logo" className="logo" style={{ width: '32px', height: '32px' }} />
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

            {isServerLoading.active && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'var(--card-background)', padding: '2rem', borderRadius: '1rem', textAlign: 'center' }}>
                        <LoadingSpinner message={isServerLoading.message} />
                        <p style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{isServerLoading.message}</p>
                    </div >
                </div >
            )}
        </div >
    );
};

export default App;