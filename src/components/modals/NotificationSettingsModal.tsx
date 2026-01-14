
import React, { FC, useState } from 'react';
import Icon from '../ui/Icon';
import { subscribeUserToPush } from '../../lib/NotificationService';

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: string | null;
}

const NotificationSettingsModal: FC<NotificationSettingsModalProps> = ({ isOpen, onClose, token }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleEnable = async () => {
        if (!token) return;
        setStatus('loading');
        try {
            await subscribeUserToPush(token);
            setStatus('success');
            setTimeout(onClose, 2000);
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMessage(e.message || 'Fehler beim Aktivieren');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Benachrichtigungen</h2>
                    <button className="modal-close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>
                <div className="modal-content">
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        Aktivieren Sie Push-Benachrichtigungen, um keine wichtigen Neuigkeiten und Termine zu verpassen.
                    </p>

                    {status === 'success' ? (
                        <div style={{ color: 'var(--text-accent-green)', textAlign: 'center', padding: '1rem' }}>
                            <Icon name="check" /> Erfolgreich aktiviert!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {status === 'error' && (
                                <div style={{ color: 'var(--button-danger-bg)', fontSize: '0.9rem' }}>
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                className="button-primary"
                                onClick={handleEnable}
                                disabled={status === 'loading'}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {status === 'loading' ? <Icon name="loader" className="spin" /> : <Icon name="bell" />}
                                Jetzt aktivieren
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsModal;
