
import React, { FC, FormEvent, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/api';
import PasswordInput from '../ui/PasswordInput';
import Icon from '../ui/Icon';

interface AuthScreenProps {
    onLoginStart: () => void;
    onLoginEnd: () => void;
    onLoginSuccess: (token: string, user: any) => void;
    logoUrl?: string;
    schoolName?: string;
}

// Füge diesen Helper hinzu oder erweitere die Komponente
interface SubscriptionError {
    code: string;
    message: string;
    support_email?: string;
}

const AuthScreen: FC<AuthScreenProps> = ({ onLoginStart, onLoginEnd, onLoginSuccess, logoUrl, schoolName }) => {
    // State erweitert um 'verify'
    const [view, setView] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [dogName, setDogName] = useState('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // Neuer State für Abo-Fehler
    const [subscriptionError, setSubscriptionError] = useState<SubscriptionError | null>(null);

    // --- LOGIN ---
    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setSubscriptionError(null); // Reset
        onLoginStart();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            const token = data.session.access_token;
            // Hier wird /api/users/me aufgerufen. Wenn das Backend 402 wirft, landet es im catch-Block.
            const userResponse = await apiClient.get('/api/users/me', token);

            onLoginSuccess(token, userResponse);

        } catch (err: any) {
            console.error(err);

            // Fehler-Text parsen
            const errorMessage = err.message || '';

            // Check auf E-Mail Bestätigung (Supabase)
            if (errorMessage === 'Email not confirmed') {
                setMessage({
                    type: 'error',
                    text: 'E-Mail noch nicht bestätigt. Bitte prüfen Sie Ihren Posteingang oder klicken Sie unten auf "E-Mail erneut senden".'
                });
                setView('verify');
                return;
            }

            // --- HIER: Logik um den JSON Fehler zu erkennen ---
            // Wir prüfen, ob im Error-String unser Error-Code steckt
            if (errorMessage.includes('SUBSCRIPTION_EXPIRED')) {
                try {
                    // Da api.ts den Body als String wirft, versuchen wir zu parsen
                    // Manchmal ist es direkt das JSON, manchmal in "detail" verschachtelt
                    let parsed = JSON.parse(errorMessage);

                    // FastAPI gibt oft { "detail": { "code": ... } } zurück
                    if (parsed.detail) parsed = parsed.detail;

                    if (parsed.code === 'SUBSCRIPTION_EXPIRED') {
                        setSubscriptionError({
                            code: parsed.code,
                            message: parsed.message,
                            support_email: parsed.support_email
                        });
                        onLoginEnd();
                        return; // Abbruch, damit keine Standard-Fehlermeldung kommt
                    }
                } catch (e) {
                    console.error("Konnte Error-JSON nicht parsen", e);
                }
            }

            // Fallback: Normale Fehlermeldung
            setMessage({ type: 'error', text: 'Login fehlgeschlagen. Bitte prüfen Sie Ihre Daten.' });
        } finally {
            onLoginEnd();
        }
    };

    // --- REGISTRIERUNG ---
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        onLoginStart();

        try {
            // 1. Branding-Metadaten für E-Mail-Templates vorbereiten
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
            const redirectUrl = window.location.origin;
            console.log("DEBUG: Redirect URL für E-Mail:", redirectUrl);

            // 2. Supabase Auth Registrierung (Löst E-Mail-Versand aus!)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        branding_name: schoolName,
                        branding_logo: logoUrl || "https://pfotencard.de/logo.png",
                        branding_color: primaryColor || "#22C55E",
                        school_name: schoolName
                    }
                }
            });

            if (authError) throw authError;

            // Schutz: Wenn keine User-ID zurückkommt, brechen wir ab (verhindert "User in DB aber nicht Auth")
            if (!authData.user) {
                throw new Error("Fehler bei der Authentifizierung. Bitte versuchen Sie es erneut.");
            }

            // 2. Profil im Backend anlegen (Nur wenn Schritt 1 erfolgreich war)
            await apiClient.post('/api/register', {
                name: name,
                email: email,
                password: password, // Wird für die DB als Hash gespeichert
                auth_id: authData.user.id,
                role: "kunde",
                dogs: [{ name: dogName }]
            }, null);

            // 3. Erfolgsfall
            if (authData.session) {
                // Falls Auto-Confirm an ist (passiert selten bei E-Mail-Zwang)
                onLoginSuccess(authData.session.access_token, await apiClient.get('/api/users/me', authData.session.access_token));
            } else {
                // Standardfall: E-Mail muss bestätigt werden
                setMessage({ type: 'success', text: 'Konto erstellt! Bitte bestätigen Sie Ihre E-Mail.' });
                setView('verify');
            }

        } catch (err: any) {
            console.error(err);
            // Falls der User in Supabase schon existiert (Fehler 400/422), geben wir das aus
            setMessage({ type: 'error', text: 'Registrierung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler') });
        } finally {
            onLoginEnd();
        }
    };
    // --- PASSWORT VERGESSEN ---
    const handleForgot = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        onLoginStart();

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Link zum Zurücksetzen wurde gesendet!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            onLoginEnd();
        }
    };

    // --- E-MAIL ERNEUT SENDEN ---
    const handleResendMail = async () => {
        setMessage(null);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'E-Mail wurde erneut gesendet!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                {logoUrl ? (
                    <img src={logoUrl} alt="PfotenCard Logo" style={{ width: '100px', height: '100px', margin: '0 auto 1rem', display: 'block', objectFit: 'contain' }} />
                ) : (
                    <div className="auth-logo-icon">
                        <Icon name="paw" width={80} height={80} />
                    </div>
                )}
                <h1>{schoolName || "PfotenCard"}</h1>
                {/* --- NEU: Abo-Ablauf Warnung --- */}
                {subscriptionError ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
                            <Icon name="alert-triangle" width={48} height={48} />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#7f1d1d' }}>Zugang momentan nicht möglich</h3>
                        <p style={{ color: '#991b1b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            {subscriptionError.message}
                        </p>

                        <p style={{ fontSize: '0.9rem', color: '#666' }}>
                            Bitte wenden Sie sich direkt an Ihre Hundeschule.
                        </p>

                        {subscriptionError.support_email && (
                            <a
                                href={`mailto:${subscriptionError.support_email}`}
                                className="button button-primary"
                                style={{ display: 'inline-block', marginTop: '1.5rem', textDecoration: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Icon name="mail" /> E-Mail an Support
                                </div>
                            </a>
                        )}

                        <button
                            onClick={() => setSubscriptionError(null)}
                            className="button button-outline"
                            style={{ marginTop: '1rem', width: '100%' }}
                        >
                            Zurück zum Login
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Hier folgt der normale Inhalt (Formular, Message Box etc.) */}
                        <p className="subtitle">
                            {view === 'login' && 'Anmelden'}
                            {view === 'register' && 'Neues Konto erstellen'}
                            {view === 'forgot' && 'Passwort zurücksetzen'}
                            {view === 'verify' && 'E-Mail Bestätigung'}
                        </p>

                        {message && (
                            <div style={{
                                padding: '10px',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
                                color: message.type === 'error' ? '#991b1b' : '#166534',
                                textAlign: 'center'
                            }}>
                                {message.text}
                            </div>
                        )}

                        {view === 'verify' ? (
                            /* --- VERIFY SCREEN --- */
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ margin: '2rem 0', color: 'var(--brand-green)', display: 'flex', justifyContent: 'center' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                                    Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
                                    Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
                                </p>
                                <button type="button" onClick={handleResendMail} className="button button-outline" style={{ width: '100%', marginBottom: '1rem' }}>
                                    E-Mail erneut senden
                                </button>
                                <button type="button" onClick={() => setView('login')} className="button button-primary" style={{ width: '100%' }}>
                                    Zum Login
                                </button>
                            </div>
                        ) : (
                            /* --- FORMULAR FÜR LOGIN / REGISTER / FORGOT --- */
                            <form onSubmit={view === 'login' ? handleLogin : (view === 'register' ? handleRegister : handleForgot)}>

                                {view === 'register' && (
                                    <>
                                        <div className="form-group"><label>Ihr Name</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required /></div>
                                        <div className="form-group"><label>Hundename</label><input type="text" className="form-input" value={dogName} onChange={e => setDogName(e.target.value)} required /></div>

                                        <div className="form-group checkbox-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                                            <input type="checkbox" required id="legal-check" style={{ width: 'auto', marginTop: '0.2rem' }} />
                                            <label htmlFor="legal-check" style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                                Ich stimme den <a href="/agb" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>AGB</a> zu und habe die <a href="/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>Datenschutzerklärung</a> zur Kenntnis genommen.
                                            </label>
                                        </div>

                                    </>
                                )}

                                <div className="form-group">
                                    <label>E-Mail</label>
                                    <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>

                                {view !== 'forgot' && (
                                    <PasswordInput
                                        label="Passwort"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                )}

                                <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '1rem' }}>
                                    {view === 'login' ? 'Anmelden' : (view === 'register' ? 'Registrieren' : 'Link senden')}
                                </button>
                            </form>
                        )}

                        {/* --- NAVIGATION LINKS (nur wenn nicht im Verify-Modus) --- */}
                        {view !== 'verify' && (
                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                {view === 'login' && (
                                    <>
                                        <button className="button-as-link" onClick={() => setView('forgot')}>Passwort vergessen?</button>
                                        <button className="button-as-link" onClick={() => setView('register')}>Noch kein Konto? Jetzt registrieren</button>
                                    </>
                                )}
                                {view !== 'login' && (
                                    <button className="button-as-link" onClick={() => setView('login')}>Zurück zum Login</button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthScreen;
