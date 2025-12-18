import React, { FC } from 'react';
import { User } from '../../types';
import Icon from '../ui/Icon';
import OnlineStatus from './OnlineStatus';
import { getInitials, getAvatarColorClass } from '../../lib/utils';

interface CustomerSidebarProps {
    user: User;
    onLogout: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    activePage: 'overview' | 'transactions';
    setPage: (page: 'overview' | 'transactions') => void;
    schoolName?: string;
    logoUrl?: string;
    // NEUE PROPS
    isPreviewMode?: boolean;
    onToggleRole?: () => void;
}

const CustomerSidebar: FC<CustomerSidebarProps> = ({ 
    user, onLogout, setSidebarOpen, activePage, setPage, schoolName = 'PfotenCard', logoUrl,
    isPreviewMode, onToggleRole 
}) => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
               {/* ... bestehender Header Code ... */}
                <img src={logoUrl || "/paw.png"} alt="PfotenCard Logo" className="logo" width="40" height="40" />
                <h2>{schoolName}</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatus />
            <nav className="sidebar-nav">
               {/* ... bestehende Navigation ... */}
                <a href="#" className={`nav-link ${activePage === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setPage('overview'); }}>
                    <Icon name="user" />
                    <span>Meine Karte</span>
                </a>
                <a href="#" className={`nav-link ${activePage === 'transactions' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setPage('transactions'); }}>
                    <Icon name="creditCard" />
                    <span>Meine Transaktionen</span>
                </a>
            </nav>

            {/* --- HIER IST DER NEUE SCHIEBEREGLER --- */}
            {isPreviewMode && onToggleRole && (
                <div className="preview-role-switch-container">
                    <div className="preview-role-label">Preview Modus</div>
                    <div className="role-toggle-wrapper">
                        <span className="role-toggle-text">Kunden-Ansicht</span>
                        <label className="switch">
                            <input type="checkbox" checked={false} onChange={onToggleRole} />
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