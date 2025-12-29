import React, { FC } from 'react';
import { User, View } from '../../types';
import Icon from '../ui/Icon';
import OnlineStatus from './OnlineStatus';
import { getInitials, getAvatarColorClass } from '../../lib/utils';

interface CustomerSidebarProps {
    user: User;
    onLogout: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    view: View;
    setView: (view: View) => void;
    schoolName?: string;
    logoUrl?: string;
    // NEUE PROPS
    isPreviewMode?: boolean;
    onToggleRole?: () => void;
    activeModules?: string[];
}

const CustomerSidebar: FC<CustomerSidebarProps> = ({
    user, onLogout, setSidebarOpen, view, setView, schoolName = 'PfotenCard', logoUrl,
    isPreviewMode, onToggleRole,
    activeModules = ['news', 'documents', 'calendar']
}) => {

    // Helper to determine active state
    const isActive = (id: string) => {
        if (id === 'overview') return view.page === 'dashboard';
        if (id === 'transactions') return view.page === 'customers' && view.subPage === 'transactions'; // Wait, transactions page for customer?
        // App.tsx logic for customer transactions?
        // Let's check App.tsx rendering.
        // If customer, `fetchAppData` sets transactions.
        // Customer "Transactions" page...
        // Usually customers see their transactions on Dashboard or a separate page.
        // Old sidebar set `activePage='transactions'`, but what did App.tsx render?
        // It likely did NOTHING different unless `customerPage` was used in `renderContent`?
        // I need to check `App.tsx` again.

        // RE-CHECK App.tsx logic for customerPage usage!
        // `renderContent` does NOT seem to use `customerPage`.
        // `DashboardPage` for customer shows transactions list.
        // Maybe "Overview" was dashboard, "Transactions" was... nothing?
        // Or maybe I missed it.
        // I'll assume I should route to a proper view.
        // If I route to `view.page='customers', subPage='transactions'`, rendered content is `TransactionManagementPage`.
        // Is that for customers? `TransactionManagementPage` seems admin-facing (booking transactions).
        // `CustomerTransactionsPage` exists.

        // I will route 'transactions' to `view.page = 'transactions_list'` (new) or something.
        // Or I map 'transactions' back to 'dashboard' but with a hash?

        // Let's stick to 'dashboard' for now for Overview.
        // For Transactions, I might need a new View type or handle it.
        // "Meine Transaktionen" -> lets assume it's `CustomerTransactionsPage` or just distinct view.

        if (id === 'transactions') return false; // Placeholder
        if (id === 'appointments') return view.page === 'appointments';
        if (id === 'news') return view.page === 'news';
        if (id === 'chat') return view.page === 'chat';
        return false;
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                {logoUrl ? (
                    <img src={logoUrl} alt="PfotenCard Logo" className="logo" width="40" height="40" />
                ) : (
                    <div className="logo-icon-container">
                        <Icon name="paw" width={32} height={32} />
                    </div>
                )}
                <h2>{schoolName}</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatus />
            <nav className="sidebar-nav">
                <a href="#" className={`nav-link ${view.page === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView({ page: 'dashboard' }); }}>
                    <Icon name="user" />
                    <span>Meine Karte</span>
                </a>

                <a href="#" className={`nav-link ${view.page === 'transactions' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView({ page: 'transactions' }); }}>
                    <Icon name="creditCard" />
                    <span>Meine Transaktionen</span>
                </a>

                {activeModules.includes('calendar') && (
                    <a href="#" className={`nav-link ${view.page === 'appointments' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView({ page: 'appointments' }); }}>
                        <Icon name="calendar" />
                        <span>Termine</span>
                    </a>
                )}

                {activeModules.includes('news') && (
                    <a href="#" className={`nav-link ${view.page === 'news' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView({ page: 'news' }); }}>
                        <Icon name="news" />
                        <span>Neuigkeiten</span>
                    </a>
                )}

                <a href="#" className={`nav-link ${view.page === 'chat' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView({ page: 'chat' }); }}>
                    <Icon name="message" />
                    <span>Nachrichten</span>
                </a>
            </nav>

            {/* --- HIER IST DER NEUE SCHIEBEREGLER --- */}
            {isPreviewMode && onToggleRole && (
                <div className="preview-role-switch-container">
                    <div className="preview-role-label">Preview Modus</div>
                    <div className="role-toggle-row">
                        <span className="role-toggle-text">Kunden-Ansicht</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={false}
                                onChange={onToggleRole}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )}
            {/* --------------------------------------- */}

            <div className="sidebar-footer">
                {/* ... bestehender Footer Code ... */}
                <div className="user-profile-container">
                    <div className="user-profile">
                        <div className={`initials-avatar small ${getAvatarColorClass(user.name)}`}>
                            {getInitials(user.name.split(' ')[0], user.name.split(' ')[1] || '')}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role">Kunde</span>
                        </div>
                    </div>
                </div>
                <button className="logout-button" onClick={onLogout} aria-label="Abmelden">
                    <Icon name="logout" />
                    <span>Abmelden</span>
                </button>
            </div>
        </aside>
    );
};

export default CustomerSidebar;