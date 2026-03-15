import React, { FC } from 'react';
import { User } from '../../types';
import Icon from '../../components/ui/Icon';
import { getInitials, getAvatarColorClass, getLevelColor } from '../../lib/utils';
import { hasPermission } from '../../lib/permissions';

interface UsersPageProps {
    users: User[];
    onAddUserClick: () => void;
    onEditUserClick: (user: User) => void;
    onDeleteUserClick: (user: User) => void;
    currentUser: User | any;
    levels?: any[];
}

const UsersPage: FC<UsersPageProps> = ({ users, onAddUserClick, onEditUserClick, onDeleteUserClick, currentUser, levels }) => {
    const staffRoles = ['admin', 'mitarbeiter', 'staff', 'trainer'];
    const systemUsers = users.filter(u => staffRoles.includes(u.role));

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Team & Benutzer</h1>
                    <p>Verwalten Sie Administratoren und Mitarbeiter</p>
                </div>
                {currentUser.role === 'admin' && (
                    <button className="button button-primary" onClick={onAddUserClick}>
                        <Icon name="plus" /> Neuer Mitarbeiter
                    </button>
                )}
            </header>

            <div className="content-box user-list" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Icon name="users" style={{ color: 'var(--primary-color)' }} />
                        Systembenutzer ({systemUsers.length})
                    </h2>
                </div>
                <div className="table-container" style={{ margin: 0 }}>
                    <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'var(--background-secondary)' }}>
                        <tr>
                            <th style={{ padding: '1rem 1.5rem' }}>Mitarbeiter</th>
                            <th style={{ padding: '1rem 1.5rem' }}>Kontakt</th>
                            <th style={{ padding: '1rem 1.5rem' }}>Rolle</th>
                            <th style={{ padding: '1rem 1.5rem' }}>Erstellt am</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Aktionen</th>
                        </tr>
                        </thead>
                        <tbody>
                        {systemUsers.map((user, idx) => {
                            const nameParts = user.name ? user.name.split(' ') : [''];
                            const firstName = nameParts[0];
                            const lastName = nameParts.slice(1).join(' ');

                            return (
                                <tr key={user.id} style={{ borderBottom: idx === systemUsers.length - 1 ? 'none' : '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--card-background-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td data-label="Mitarbeiter" style={{ padding: '1rem 1.5rem' }}>
                                        <div className="user-cell" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {(() => {
                                                const levelId = user.level_id || user.current_level_id;
                                                const levelColor = getLevelColor(levelId, levels);
                                                return (
                                                    <div
                                                        className={`initials-avatar ${!levelColor ? getAvatarColorClass(firstName) : ''}`}
                                                        style={levelColor ? { backgroundColor: levelColor, color: 'white' } : {}}
                                                    >
                                                        {getInitials(firstName, lastName)}
                                                    </div>
                                                );
                                            })()}
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {user.id}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Kontakt" style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Icon name="mail" size={14} /> {user.email}
                                        </div>
                                    </td>
                                    <td data-label="Rolle" style={{ padding: '1rem 1.5rem' }}>
                                            <span className={`role-badge ${user.role}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Icon name={user.role === 'admin' ? 'shield' : 'briefcase'} size={12} />
                                                {user.role}
                                            </span>
                                    </td>
                                    <td data-label="Erstellt am" style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {new Date(user.createdAt || new Date()).toLocaleDateString('de-DE')}
                                    </td>
                                    <td data-label="Aktionen" style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div className="actions-cell-wrapper" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.5rem' }}>
                                            <button className="action-icon-btn" onClick={() => onEditUserClick(user)} title="Bearbeiten" style={{ backgroundColor: 'var(--background-secondary)' }}>
                                                <Icon name="edit" size={16} />
                                            </button>
                                            {currentUser.role === 'admin' && currentUser.id !== user.id && (
                                                <button className="action-icon-btn delete" onClick={() => onDeleteUserClick(user)} title="Zugang entziehen" style={{ backgroundColor: 'var(--danger-bg-light)' }}>
                                                    <Icon name="trash" size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UsersPage;