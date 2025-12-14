
import React, { FC, useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import Icon from '../ui/Icon';

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
            setPassword(''); // Passwort beim Bearbeiten leer lassen, außer es soll geändert werden
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
        if (!user && !password) {
            alert("Für neue Benutzer ist ein Passwort erforderlich.");
            return;
        }

        const data: any = { name, email, role };
        if (password) {
            data.password = password; // Nur senden wenn gesetzt
        }

        onSave(data);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header blue">
                    <h2>{user ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group"><label>Name</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>E-Mail</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div className="form-group">
                        <label>Rolle</label>
                        <select className="form-input" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                            <option value="admin">Administrator</option>
                            <option value="mitarbeiter">Mitarbeiter</option>
                            {/* Kunden werden hier nicht manuell angelegt, sondern in der Kundenverwaltung */}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Passwort {user && '(leer lassen zum Beibehalten)'}</label>
                        <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={user ? '********' : ''} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>Abbrechen</button>
                    <button className="button button-primary" onClick={handleSubmit}>Speichern</button>
                </div>
            </div>
        </div>
    );
};

export default UserFormModal;
