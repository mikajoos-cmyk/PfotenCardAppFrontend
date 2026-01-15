
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
    const [activeTab, setActiveTab] = useState<'email' | 'push'>('email');

    // Local state for all settings
    const [settings, setSettings] = useState({
        notif_email_overall: user?.notif_email_overall ?? true,
        notif_email_chat: user?.notif_email_chat ?? true,
        notif_email_news: user?.notif_email_news ?? true,
        notif_email_booking: user?.notif_email_booking ?? true,
        notif_email_reminder: user?.notif_email_reminder ?? true,
        notif_email_alert: user?.notif_email_alert ?? true,

        notif_push_overall: user?.notif_push_overall ?? true,
        notif_push_chat: user?.notif_push_chat ?? true,
        notif_push_news: user?.notif_push_news ?? true,
        notif_push_booking: user?.notif_push_booking ?? true,
        notif_push_reminder: user?.notif_push_reminder ?? true,
        notif_push_alert: user?.notif_push_alert ?? true,

        reminder_offset_minutes: user?.reminder_offset_minutes ?? 60,
    });

    useEffect(() => {
        if (user && isOpen) {
            setSettings({
                notif_email_overall: user.notif_email_overall ?? true,
                notif_email_chat: user.notif_email_chat ?? true,
                notif_email_news: user.notif_email_news ?? true,
                notif_email_booking: user.notif_email_booking ?? true,
                notif_email_reminder: user.notif_email_reminder ?? true,
                notif_email_alert: user.notif_email_alert ?? true,

                notif_push_overall: user.notif_push_overall ?? true,
                notif_push_chat: user.notif_push_chat ?? true,
                notif_push_news: user.notif_push_news ?? true,
                notif_push_booking: user.notif_push_booking ?? true,
                notif_push_reminder: user.notif_push_reminder ?? true,
                notif_push_alert: user.notif_push_alert ?? true,

                reminder_offset_minutes: user.reminder_offset_minutes ?? 60,
            });
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleSaveField = async (key: string, value: any) => {
        if (!token || !user) return;

        setStatus('loading');
        try {
            await apiClient.put(`/api/users/${user.id}`, { [key]: value }, token);

            // Push overall special handling
            if (key === 'notif_push_overall' && value === true) {
                if (!('Notification' in window && Notification.permission === 'granted')) {
                    try { await subscribeUserToPush(token); } catch (e) { console.warn(e); }
                }
            }

            setStatus('success');
            onRefresh();
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMessage(e.message || 'Fehler beim Speichern');

            // Revert local state on error (optional, but good for UX)
            // For now just letting the user see the error
        }
    };

    const handleToggle = (key: keyof typeof settings) => {
        const newValue = !settings[key];
        setSettings(prev => ({ ...prev, [key]: newValue }));
        handleSaveField(key as string, newValue);
    };

    const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 0;
        setSettings(prev => ({ ...prev, reminder_offset_minutes: value }));
    };

    const handleOffsetBlur = () => {
        handleSaveField('reminder_offset_minutes', settings.reminder_offset_minutes);
    };

    const renderToggleRow = (label: string, description: string, icon: any, key: keyof typeof settings, disabled: boolean = false, accent: string = 'blue') => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                backgroundColor: 'var(--background-color)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                opacity: disabled ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
                marginBottom: '0.75rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: `var(--bg-accent-${accent})`,
                        color: `var(--text-accent-${accent})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon name={icon} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{description}</div>
                    </div>
                </div>
                <label className="switch">
                    <input
                        type="checkbox"
                        checked={settings[key] as boolean}
                        onChange={() => handleToggle(key)}
                        disabled={status === 'loading' || disabled}
                    />
                    <span className="slider"></span>
                </label>
            </div>

            {/* Conditional input for reminder offset */}
            {key.includes('reminder') && settings[key] && !disabled && (
                <div style={{ marginTop: '1rem', paddingLeft: '3.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Erinnerung</span>
                    <input
                        type="number"
                        className="form-input"
                        style={{ width: '80px', padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                        value={settings.reminder_offset_minutes}
                        onChange={handleOffsetChange}
                        onBlur={handleOffsetBlur}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Minuten vor dem Termin</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header blue">
                    <h2>Benachrichtigungen</h2>
                    <button className="close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '0' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)' }}>
                        <button
                            onClick={() => setActiveTab('email')}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === 'email' ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === 'email' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Icon name="mail" width={18} height={18} /> E-Mail
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('push')}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === 'push' ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === 'push' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Icon name="bell" width={18} height={18} /> Push
                            </div>
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {activeTab === 'email' ? (
                            <>
                                {renderToggleRow("Alle E-Mails erlauben", "Hauptschalter für alle E-Mail Benachrichtigungen", "mail", "notif_email_overall", false, "orange")}
                                <div style={{
                                    paddingLeft: '1rem',
                                    borderLeft: '2px solid var(--border-color)',
                                    marginLeft: '1.25rem',
                                    marginTop: '1.5rem'
                                }}>
                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                        E-Mail Benachrichtigungsgründe
                                    </h4>
                                    {renderToggleRow("Neuigkeiten", "Updates deiner Hundeschule", "news", "notif_email_news", !settings.notif_email_overall, "purple")}
                                    {renderToggleRow("Termine", "Buchungsbestätigungen & Änderungen", "calendar", "notif_email_booking", !settings.notif_email_overall, "green")}
                                    {renderToggleRow("Erinnerungen", "Erinnerungen an kommende Termine", "clock", "notif_email_reminder", !settings.notif_email_overall, "blue")}
                                    {renderToggleRow("Wichtige Alarme", "Status-Änderungen der Hundeschule", "alarm", "notif_email_alert", !settings.notif_email_overall, "red")}
                                </div>
                            </>
                        ) : (
                            <>
                                {renderToggleRow("Alle Push erlauben", "Hauptschalter für Push-Benachrichtigungen", "bell", "notif_push_overall", false, "green")}
                                <div style={{
                                    paddingLeft: '1rem',
                                    borderLeft: '2px solid var(--border-color)',
                                    marginLeft: '1.25rem',
                                    marginTop: '1.5rem'
                                }}>
                                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                        Push Benachrichtigungsgründe
                                    </h4>
                                    {renderToggleRow("Chat-Nachrichten", "Direkte Nachrichten am Handy", "mail", "notif_push_chat", !settings.notif_push_overall)}
                                    {renderToggleRow("Neuigkeiten", "Push bei neuen Updates", "news", "notif_push_news", !settings.notif_push_overall, "purple")}
                                    {renderToggleRow("Termine", "Echtzeit-Updates zu Buchungen", "calendar", "notif_push_booking", !settings.notif_push_overall, "green")}
                                    {renderToggleRow("Erinnerungen", "Erinnerungen an kommende Termine", "clock", "notif_push_reminder", !settings.notif_push_overall, "blue")}
                                    {renderToggleRow("Wichtige Alarme", "Dringende Status-Änderungen", "alarm", "notif_push_alert", !settings.notif_push_overall, "red")}
                                </div>
                            </>
                        )}

                        {status === 'error' && (
                            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--brand-red)', borderRadius: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <Icon name="x" width={16} height={16} /> {errorMessage}
                            </div>
                        )}
                    </div>
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
