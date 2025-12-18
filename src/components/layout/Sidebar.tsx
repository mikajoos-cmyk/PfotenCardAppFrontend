
import React, { FC } from 'react';
import { User, Page, View } from '../../types';
import Icon from '../ui/Icon';
import OnlineStatus from './OnlineStatus';
import { getInitials, getAvatarColorClass } from '../../lib/utils';

interface SidebarProps {
    user: User;
    activePage: Page;
    setView: (view: View) => void;
    onLogout: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    logoUrl?: string;
    schoolName?: string;
    isPreviewMode?: boolean;
    onToggleRole?: () => void;
}

const Sidebar: FC<SidebarProps> = ({
    user,
    activePage,
    setView,
    onLogout,
    setSidebarOpen,
    logoUrl,
    schoolName,
    isPreviewMode,
    onToggleRole
}) => {
    const navItems = [
        { id: 'dashboard', label: 'Übersicht', icon: 'dashboard', roles: ['admin', 'mitarbeiter'] },
        { id: 'customers', label: 'Kunden', icon: 'customers', roles: ['admin', 'mitarbeiter'] },
        { id: 'reports', label: 'Berichte', icon: 'reports', roles: ['admin', 'mitarbeiter'] },
        { id: 'users', label: 'Benutzer', icon: 'users', roles: ['admin'] },
    ];

    const handleNavClick = (view: View) => {
        setView(view);
        if (window.innerWidth <= 992) {
            setSidebarOpen(false);
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src={logoUrl || "/paw.png"} alt="PfotenCard Logo" className="logo" width="40" height="40" />
                <h2>{schoolName || 'PfotenCard'}</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatus />
            <nav className="sidebar-nav">
                {navItems.filter(item => item.roles.includes(user.role)).map(item => (
                    <a key={item.id} href="#" className={`nav-link ${activePage === item.id ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick({ page: item.id as Page }); }}>
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="user-profile-container">
                    <div className="user-profile">
                        <div className={`initials-avatar small ${getAvatarColorClass(user.name)}`}>
                            {getInitials(user.name.split(' ')[0], user.name.split(' ')[1] || '')}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role">{user.role}</span>
                        </div>
                    </div>
                </div>

                {isPreviewMode && onToggleRole && (
                    <button className="preview-action-button" onClick={onToggleRole} title="Zu Kunden-Ansicht wechseln">
                        <Icon name="refresh" />
                        <span>Zu Kunden-Ansicht</span>
                    </button>
                )}

                <button className="logout-button" onClick={onLogout} aria-label="Abmelden">
                    <Icon name="logout" />
                    <span>Abmelden</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
