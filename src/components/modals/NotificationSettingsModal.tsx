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
        notif_email_alert: user?.notif_email_alert ?? true,

        notif_push_overall: user?.notif_push_overall ?? true,
        notif_push_chat: user?.notif_push_chat ?? true,
        notif_push_news: user?.notif_push_news ?? true,
        notif_push_booking: user?.notif_push_booking ?? true,
        notif_push_alert: user?.notif_push_alert ?? true,
    });

    // Track if we have synced with the user prop for this open session
    const hasSyncedRef = React.useRef(false);

    // Reset sync flag when modal closes
    useEffect(() => {
        if (!isOpen) {
            hasSyncedRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        // Only sync if we haven't synced yet for this session
        if (user && isOpen && !hasSyncedRef.current) {
            setSettings({
                notif_email_overall: user.notif_email_overall ?? true,
                notif_email_chat: user.notif_email_chat ?? true,
                notif_email_news: user.notif_email_news ?? true,
                notif_email_booking: user.notif_email_booking ?? true,
                notif_email_alert: user.notif_email_alert ?? true,

                notif_push_overall: user.notif_push_overall ?? true,
                notif_push_chat: user.notif_push_chat ?? true,
                notif_push_news: user.notif_push_news ?? true,
                notif_push_booking: user.notif_push_booking ?? true,
                notif_push_alert: user.notif_push_alert ?? true,
            });
            hasSyncedRef.current = true;
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleSaveField = async (key: string, value: any) => {
        if (!token || !user) return;

        setStatus('loading');
        try {
            await apiClient.put(`/api/users/${user.id}`, { [key]: value }, token);

            // Push overall special handling
            // FIX: Wir führen subscribeUserToPush IMMER aus, wenn eingeschaltet wird.
            // Das stellt sicher, dass fehlende Keys in der DB nachgetragen werden,
            // auch wenn der Browser die Berechtigung schon hat.
            if (key === 'notif_push_overall' && value === true) {
                try {
                    console.log("Versuche Push-Abo zu erneuern...");
                    await subscribeUserToPush(token);
                    console.log("Push-Abo erfolgreich an Backend gesendet.");
                } catch (e) {
                    console.warn("Fehler beim Push-Abo erneuern:", e);
                }
            }

            setStatus('success');
            onRefresh();
            setTimeout(() => setStatus('idle'), 2000);
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMessage(e.message || 'Fehler beim Speichern');
        }
    };

    const handleToggle = (key: string) => {
        const newValue = !settings[key as keyof typeof settings];
        setSettings(prev => ({ ...prev, [key]: newValue }));
        handleSaveField(key, newValue);
    };

    const renderToggleRow = (label: string, description: string, icon: any, key: string, disabled: boolean = false, accent: string = 'blue') => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0.875rem',
                backgroundColor: 'var(--background-color)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                opacity: disabled ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
                marginBottom: '0.75rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0, flex: 1 }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        borderRadius: '50%',
                        backgroundColor: `var(--bg-accent-${accent})`,
                        color: `var(--text-accent-${accent})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon name={icon} width={20} height={20} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ 
                            fontWeight: '600', 
                            color: 'var(--text-primary)',
                            fontSize: '0.95rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }} title={label}>{label}</div>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)',
                            lineHeight: '1.2',
                            marginTop: '0.125rem'
                        }}>{description}</div>
                    </div>
                </div>
                <label className="switch" style={{ flexShrink: 0 }}>
                    <input
                        type="checkbox"
                        checked={settings[key as keyof typeof settings] as boolean}
                        onChange={() => handleToggle(key)}
                        disabled={status === 'loading' || disabled}
                    />
                    <span className="slider"></span>
                </label>
            </div>
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

                <div className="modal-body" style={{ padding: '0', overflowX: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--background-color)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <button
                            onClick={() => setActiveTab('email')}
                            style={{
                                flex: 1,
                                padding: '0.875rem 0.5rem',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === 'email' ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === 'email' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                minWidth: '100px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.9rem' }}>
                                <Icon name="mail" width={16} height={16} /> E-Mail
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('push')}
                            style={{
                                flex: 1,
                                padding: '0.875rem 0.5rem',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === 'push' ? '3px solid var(--primary-color)' : '3px solid transparent',
                                color: activeTab === 'push' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                minWidth: '100px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.9rem' }}>
                                <Icon name="bell" width={16} height={16} /> Push
                            </div>
                        </button>
                    </div>

                    <div style={{ padding: '1rem 0.75rem' }}>
                        {activeTab === 'email' ? (
                            <>
                                {renderToggleRow("Alle E-Mails erlauben", "Hauptschalter für alle E-Mails", "mail", "notif_email_overall", false, "orange")}
                                <div style={{
                                    paddingLeft: '0.75rem',
                                    borderLeft: '2px solid var(--border-color)',
                                    marginLeft: '1rem',
                                    marginTop: '1.25rem'
                                }}>
                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                        E-Mail Benachrichtigungsgründe
                                    </h4>
                                    {renderToggleRow("Neuigkeiten", "Updates deiner Hundeschule", "news", "notif_email_news", !settings.notif_email_overall, "purple")}
                                    {renderToggleRow("Termine", "Buchungen & Änderungen", "calendar", "notif_email_booking", !settings.notif_email_overall, "green")}
                                    {renderToggleRow("Wichtige Alarme", "Status-Änderungen", "alarm", "notif_email_alert", !settings.notif_email_overall, "red")}
                                </div>
                            </>
                        ) : (
                            <>
                                {renderToggleRow("Alle Push erlauben", "Hauptschalter für Push", "bell", "notif_push_overall", false, "green")}
                                <div style={{
                                    paddingLeft: '0.75rem',
                                    borderLeft: '2px solid var(--border-color)',
                                    marginLeft: '1rem',
                                    marginTop: '1.25rem'
                                }}>
                                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                        Push Benachrichtigungsgründe
                                    </h4>
                                    {renderToggleRow("Chat-Nachrichten", "Nachrichten am Handy", "mail", "notif_push_chat", !settings.notif_push_overall)}
                                    {renderToggleRow("Neuigkeiten", "Push bei neuen Updates", "news", "notif_push_news", !settings.notif_push_overall, "purple")}
                                    {renderToggleRow("Termine", "Updates zu Buchungen", "calendar", "notif_push_booking", !settings.notif_push_overall, "green")}
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