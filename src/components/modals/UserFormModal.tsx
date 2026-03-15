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
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            alert("Name und E-Mail sind Pflichtfelder.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data: any = { name, email, role };
            if (password) {
                data.password = password;
            }
            await onSave(data);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header blue">
                    <h2>{user ? 'Benutzer bearbeiten' : 'Mitarbeiter einladen'}</h2>
                    <button className="close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>

                <div className="modal-body">
                    <form id="user-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Name des Mitarbeiters *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Max Mustermann"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>E-Mail-Adresse *</label>
                            <input
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="mitarbeiter@hundeschule.de"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Rolle & Berechtigungen *</label>
                            <select
                                className="form-input"
                                value={role}
                                onChange={e => setRole(e.target.value as UserRole)}
                                required
                            >
                                <option value="mitarbeiter">Mitarbeiter (Eingeschränkter Zugriff)</option>
                                <option value="admin">Administrator (Vollzugriff)</option>
                            </select>
                        </div>

                        {user ? (
                            <div className="form-group" style={{ marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', marginBottom: 0 }}>
                                <label>Passwort ändern (leer lassen zum Beibehalten)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-input"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Neues Passwort eingeben"
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                                            padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        title={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                                    >
                                        <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                backgroundColor: 'var(--bg-accent-blue)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'flex-start',
                                marginTop: '0.5rem'
                            }}>
                                <div style={{ backgroundColor: 'white', color: 'var(--brand-blue)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon name="mail" size={16} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Einladung per E-Mail</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Der Benutzer erhält automatisch einen Link, um seine E-Mail-Adresse zu bestätigen und ein eigenes Passwort festzulegen.
                                    </p>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="modal-footer">
                    <button type="button" className="button button-outline" onClick={onClose}>
                        Abbrechen
                    </button>
                    <button type="submit" form="user-form" className="button button-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Speichert...' : (user ? 'Speichern' : 'Einladung senden')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserFormModal;