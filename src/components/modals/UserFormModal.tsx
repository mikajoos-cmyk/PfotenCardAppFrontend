import React, { FC, useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import Icon from '../ui/Icon';
import PasswordInput from '../ui/PasswordInput';

interface UserFormModalProps {
    user: User | null;
    onClose: () => void;
    onSave: (data: any) => void;
}

const UserFormModal: FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState<UserRole>(user?.role || 'mitarbeiter');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
            setPassword('');
        } else {
            setName('');
            setEmail('');
            setRole('mitarbeiter');
            setPassword('');
        }
    }, [user]);

    const handleSubmit = () => {
        if (!name || !email) {
            alert("Name und E-Mail sind Pflichtfelder.");
            return;
        }

        // ÄNDERUNG: Passwort-Check für neue User entfernt (da Einladung gesendet wird)

        const data: any = { name, email, role };

        // Nur wenn explizit ein Passwort gesetzt wurde (z.B. beim Bearbeiten), senden wir es mit
        if (password) {
            data.password = password;
        }

        onSave(data);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header blue">
                    <h2>{user ? 'Benutzer bearbeiten' : 'Mitarbeiter einladen'}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group"><label>Name</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" /></div>
                    <div className="form-group"><label>E-Mail</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="mitarbeiter@hundeschule.de" /></div>
                    <div className="form-group">
                        <label>Rolle</label>
                        <select className="form-input" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                            <option value="mitarbeiter">Mitarbeiter (Eingeschränkt)</option>
                            <option value="admin">Administrator (Vollzugriff)</option>
                        </select>
                    </div>

                    {/* ÄNDERUNG: Passwortfeld nur beim Bearbeiten anzeigen, sonst Hinweis */}
                    {user ? (
                        <div className="mt-4 pt-4 border-t border-border">
                            <PasswordInput
                                label="Passwort ändern (leer lassen zum Beibehalten)"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Neues Passwort"
                            />
                        </div>
                    ) : (
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm border border-blue-100 flex gap-3 items-start mt-4">
                            <Icon name="mail" width={20} height={20} className="shrink-0 mt-0.5" />
                            <div>
                                <strong>Einladung per E-Mail</strong>
                                <p className="mt-1 opacity-90">Der Benutzer erhält einen Link, um seine E-Mail zu bestätigen und ein eigenes Passwort festzulegen.</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>Abbrechen</button>
                    <button className="button button-primary" onClick={handleSubmit}>
                        {user ? 'Speichern' : 'Einladung senden'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserFormModal;