
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
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Benutzerverwaltung</h1>
                    <p>Verwalten Sie alle Systembenutzer an einem Ort</p>
                </div>
                {currentUser.role === 'admin' && (
                    <div className="header-actions">
                        <button className="button button-primary" onClick={onAddUserClick}>+ Neuer Benutzer</button>
                    </div>
                )}
            </header>
            <div className="content-box user-list">
                <h2>Systembenutzer ({systemUsers.length})</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Benutzer</th><th>E-Mail</th><th>Rolle</th><th>Erstellt</th><th>Aktionen</th></tr>
                        </thead>
                        <tbody>
                            {systemUsers.map(user => {
                                const nameParts = user.name ? user.name.split(' ') : [''];
                                const firstName = nameParts[0];
                                const lastName = nameParts.slice(1).join(' ');

                                return (
                                    <tr key={user.id}>
                                        <td data-label="Benutzer">
                                            <div className="user-cell">
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
                                                <div>
                                                    <div className="user-fullname">{firstName}</div>
                                                    <div className="user-subname">{lastName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="E-Mail">{user.email}</td>
                                        <td data-label="Rolle"><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                        <td data-label="Erstellt">{new Date(user.createdAt || new Date()).toLocaleDateString('de-DE')}</td>
                                        <td data-label="Aktionen">
                                            <div className="actions-cell-wrapper">
                                                <button className="action-icon-btn" onClick={() => onEditUserClick(user)} aria-label="Bearbeiten"><Icon name="edit" /></button>
                                                {((user.role === 'customer' || user.role === 'kunde') ? hasPermission(currentUser, 'can_delete_customers') : currentUser.role === 'admin') && (
                                                    <button className="action-icon-btn delete" onClick={() => onDeleteUserClick(user)} aria-label="Löschen"><Icon name="trash" /></button>
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
        </>
    );
};

export default UsersPage;
