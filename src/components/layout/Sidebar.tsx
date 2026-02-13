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
    activeModules?: string[];
    unreadChatCount?: number;
    hasNewNews?: boolean;
    onOpenNotifications?: () => void;
    levels?: any[];
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
    onToggleRole,
    activeModules = ['news', 'documents', 'calendar', 'chat'],
    unreadChatCount = 0,
    hasNewNews = false,
    onOpenNotifications,
    levels
}) => {
    const navItems = [
        { id: 'dashboard', label: 'Übersicht', icon: 'dashboard', roles: ['admin', 'mitarbeiter'] },
        { id: 'customers', label: 'Kunden', icon: 'customers', roles: ['admin', 'mitarbeiter'] },
        { id: 'appointments', label: 'Termine', icon: 'calendar', roles: ['admin', 'mitarbeiter'], moduleId: 'calendar' },
        { id: 'reports', label: 'Berichte', icon: 'reports', roles: ['admin', 'mitarbeiter'] },
        { id: 'users', label: 'Benutzer', icon: 'users', roles: ['admin'] },
        // HIER: moduleId hinzugefügt
        { id: 'news', label: 'Neuigkeiten', icon: 'file', roles: ['admin', 'mitarbeiter'], moduleId: 'news' },
        { id: 'chat', label: 'Nachrichten', icon: 'mail', roles: ['admin', 'mitarbeiter'], moduleId: 'chat' },
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
                {logoUrl ? (
                    <img src={logoUrl} alt="PfotenCard Logo" className="logo" width="40" height="40" />
                ) : (
                    <div className="logo-icon-container">
                        <Icon name="paw" width={32} height={32} />
                    </div>
                )}
                <h2>{schoolName || 'PfotenCard'}</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatus />
            <nav className="sidebar-nav">
                {navItems
                    .filter(item => item.roles.includes(user.role))
                    // Filtert Module heraus, die nicht in den Einstellungen aktiv sind
                    .filter(item => !item.moduleId || activeModules.includes(item.moduleId))
                    .map(item => {
                        const hasNotification = (item.id === 'chat' && unreadChatCount > 0) || (item.id === 'news' && hasNewNews);

                        return (
                            <a key={item.id} href="#" className={`nav-link ${activePage === item.id ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick({ page: item.id as Page }); }}>
                                <Icon name={item.icon} />
                                <span>{item.label}</span>
                                {hasNotification && (
                                    <span style={{
                                        position: 'absolute',
                                        right: '1rem',
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: 'var(--primary-color)',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 0 2px var(--sidebar-bg)'
                                    }} />
                                )}
                            </a>
                        );
                    })}
            </nav>

            {isPreviewMode && onToggleRole && (
                <div className="preview-role-switch-container">
                    <div className="preview-role-label">Preview Modus</div>
                    <div className="role-toggle-row">
                        <span className="role-toggle-text">Admin-Ansicht</span>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={true}
                                onChange={onToggleRole}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )}

            <div className="sidebar-footer">
                <div className="user-profile-container">
                    <div className="user-profile">
                        {(() => {
                            const levelId = user.level_id || user.current_level_id;
                            const levelColor = getLevelColor(levelId, levels);
                            const firstName = user.name.split(' ')[0];
                            const lastName = user.name.split(' ')[1] || '';

                            return (
                                <div 
                                    className={`initials-avatar small ${!levelColor ? getAvatarColorClass(firstName) : ''}`}
                                    style={levelColor ? { backgroundColor: levelColor, color: 'white' } : {}}
                                >
                                    {getInitials(firstName, lastName)}
                                </div>
                            );
                        })()}
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role">{user.role}</span>
                        </div>
                        {onOpenNotifications && (
                            <button
                                className="button-icon-only"
                                onClick={() => {
                                    onOpenNotifications();
                                    if (window.innerWidth <= 992) {
                                        setSidebarOpen(false);
                                    }
                                }}
                                title="Benachrichtigungen"
                                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
                            >
                                <Icon name="bell" />
                            </button>
                        )}
                    </div>
                </div>

                <button className="logout-button" onClick={onLogout} aria-label="Abmelden">
                    <Icon name="logout" />
                    <span>Abmelden</span>
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <button className="button-as-link" style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)' }} onClick={() => setView({ page: 'impressum' })}>Impressum</button>
                    <span style={{ color: 'var(--sidebar-text)', fontSize: '0.75rem' }}>|</span>
                    <button className="button-as-link" style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)' }} onClick={() => setView({ page: 'datenschutz' })}>Datenschutz</button>
                </div>


            </div>
        </aside>
    );
};

export default Sidebar;