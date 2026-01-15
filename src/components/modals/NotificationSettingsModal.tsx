
import React, { FC, useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { subscribeUserToPush } from '../../lib/NotificationService';
import { apiClient } from '../../lib/api';
import { User } from '../../types';

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: string | null;
    user: User | null;
    onRefresh: () => void;
}

const NotificationSettingsModal: FC<NotificationSettingsModalProps> = ({ isOpen, onClose, token, user, onRefresh }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [emailEnabled, setEmailEnabled] = useState(user?.notifications_email ?? true);
    const [pushEnabled, setPushEnabled] = useState(user?.notifications_push ?? true);

    useEffect(() => {
        if (user) {
            setEmailEnabled(user.notifications_email ?? true);
            setPushEnabled(user.notifications_push ?? true);
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (newEmail: boolean, newPush: boolean) => {
        if (!token || !user) return;

        setStatus('loading');
        try {
            // Update user preferences in backend
            await apiClient.put(`/api/users/${user.id}`, {
                notifications_email: newEmail,
                notifications_push: newPush
            }, token);

            // If push is enabled but not subscribed yet, try to subscribe
            if (newPush && !('Notification' in window && Notification.permission === 'granted')) {
                try {
                    await subscribeUserToPush(token);
                } catch (pushErr) {
                    console.warn("Could not subscribe to push, but settings saved:", pushErr);
                    // We don't fail the whole save if push subscription fails (e.g. denied by user)
                }
            }

            setStatus('success');
            onRefresh();
            setTimeout(() => {
                setStatus('idle');
            }, 2000);
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMessage(e.message || 'Fehler beim Speichern');
        }
    };

    const toggleEmail = () => {
        const newValue = !emailEnabled;
        setEmailEnabled(newValue);
        handleSave(newValue, pushEnabled);
    };

    const togglePush = () => {
        const newValue = !pushEnabled;
        setPushEnabled(newValue);
        handleSave(emailEnabled, newValue);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                <div className="modal-header blue">
                    <h2>Benachrichtigungen</h2>
                    <button className="close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Wählen Sie aus, wie Sie über wichtige Neuigkeiten, Termine und Nachrichten informiert werden möchten.
                    </p>

                    <div className="settings-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* E-Mail Notifications */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                backgroundColor: 'var(--background-color)',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--bg-accent-orange)',
                                    color: 'var(--text-accent-orange)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon name="mail" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>E-Mail</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Berichte & Status-Updates</div>
                                </div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={emailEnabled}
                                    onChange={toggleEmail}
                                    disabled={status === 'loading'}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {/* Push Notifications */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                backgroundColor: 'var(--background-color)',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--bg-accent-green)',
                                    color: 'var(--text-accent-green)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon name="bell" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Push-Nachrichten</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Echtzeit-Nachrichten am Handy</div>
                                </div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={pushEnabled}
                                    onChange={togglePush}
                                    disabled={status === 'loading'}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>

                    {status === 'error' && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--brand-red)',
                            borderRadius: '0.5rem',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Icon name="x" width={16} height={16} />
                            {errorMessage}
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-accent-green)',
                            color: 'var(--text-accent-green)',
                            borderRadius: '0.5rem',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Icon name="check" width={16} height={16} />
                            Erfolgreich gespeichert
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose} style={{ width: '100%' }}>
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsModal;
