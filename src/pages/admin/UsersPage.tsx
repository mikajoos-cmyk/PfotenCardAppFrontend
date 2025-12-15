
import React, { FC } from 'react';
import { User } from '../../types';
import Icon from '../../components/ui/Icon';
import { getInitials, getAvatarColorClass } from '../../lib/utils';

interface UsersPageProps {
    users: User[];
    onAddUserClick: () => void;
    onEditUserClick: (user: User) => void;
    onDeleteUserClick: (user: User) => void;
}

const UsersPage: FC<UsersPageProps> = ({ users, onAddUserClick, onEditUserClick, onDeleteUserClick }) => {
    const systemUsers = users.filter(u => u.role === 'admin' || u.role === 'mitarbeiter');

    return (
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Benutzerverwaltung</h1>
                    <p>Verwalten Sie alle Systembenutzer an einem Ort</p>
                </div>
                <div className="header-actions">
                    <button className="button button-primary" onClick={onAddUserClick}>+ Neuer Benutzer</button>
                </div>
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
                                                <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                                    {getInitials(firstName, lastName)}
                                                </div>
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
                                                <button className="action-icon-btn delete" onClick={() => onDeleteUserClick(user)} aria-label="Löschen"><Icon name="trash" /></button>
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
