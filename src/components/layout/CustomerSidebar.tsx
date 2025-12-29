import React, { FC } from 'react';
import { User, View } from '../../types';
import Icon from '../ui/Icon';
import OnlineStatus from './OnlineStatus';
import { getInitials, getAvatarColorClass } from '../../lib/utils';

interface CustomerSidebarProps {
    user: User;
    onLogout: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    // View statt activePage nutzen für Konsistenz
    view?: View;
    activePage?: string;
    setPage?: (page: any) => void;
    setView?: (view: View) => void;
    schoolName?: string;
    logoUrl?: string;
    isPreviewMode?: boolean;
    onToggleRole?: () => void;
    activeModules?: string[];
}

const CustomerSidebar: FC<CustomerSidebarProps> = ({
    user, onLogout, setSidebarOpen, view, setView, activePage, setPage, schoolName = 'PfotenCard', logoUrl,
    isPreviewMode, onToggleRole,
    activeModules = ['news', 'documents', 'calendar', 'chat']
}) => {

    // Navigation Logik vereinheitlichen (Legacy Support für activePage prop)
    const currentId = view?.page || activePage || 'overview';
    const handleNav = (id: string) => {
        if (setView) setView({ page: id as any });
        else if (setPage) setPage(id as any);
        if (window.innerWidth <= 992) setSidebarOpen(false);
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
                <a href="#" className={`nav-link ${currentId === 'overview' || currentId === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNav('dashboard'); }}>
                    <Icon name="user" />
                    <span>Meine Karte</span>
                </a>
                <a href="#" className={`nav-link ${currentId === 'transactions' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNav('transactions'); }}>
                    <Icon name="creditCard" />
                    <span>Transaktionen</span>
                </a>

                {/* Dynamische Module */}
                {activeModules.includes('calendar') && (
                    <a href="#" className={`nav-link ${currentId === 'appointments' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNav('appointments'); }}>
                        <Icon name="calendar" />
                        <span>Termine</span>
                    </a>
                )}
                {activeModules.includes('news') && (
                    <a href="#" className={`nav-link ${currentId === 'news' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNav('news'); }}>
                        <Icon name="file" />
                        <span>Neuigkeiten</span>
                    </a>
                )}
                {activeModules.includes('chat') && (
                    <a href="#" className={`nav-link ${currentId === 'chat' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNav('chat'); }}>
                        <Icon name="mail" />
                        <span>Nachrichten</span>
                    </a>
                )}
            </nav>

            {isPreviewMode && onToggleRole && (
                <div className="preview-role-switch-container">
                    <div className="preview-role-label">Preview Modus</div>
                    <div className="role-toggle-row">
                        <span className="role-toggle-text">Kunden-Ansicht</span>
                        <label className="switch">
                            <input type="checkbox" checked={false} onChange={onToggleRole} />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )}

            <div className="sidebar-footer">
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