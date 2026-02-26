import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserCheck, FileText, Server, CreditCard, ArrowLeft, Bell, Info, Trash2, Mail } from 'lucide-react';
import Icon from '../../components/ui/Icon';

interface DatenschutzPageProps {
    onBack?: () => void;
    showBack?: boolean;
    legalSettings?: any;
    schoolName?: string;
}

export function DatenschutzPage({ onBack, showBack = true, legalSettings, schoolName }: DatenschutzPageProps) {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="legal-page">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {showBack && (
                        <button onClick={onBack} className="back-button">
                            <ArrowLeft size={20} />
                            Zurück
                        </button>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="text-primary">
                            <Icon name="file" width={48} height={48} />
                        </div>
                        <h1>Datenschutzerklärung</h1>
                    </div>

                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Stand: Februar 2026. Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* 1. Verantwortliche Stelle */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <UserCheck size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>1. Verantwortliche Stelle</h2>
                                    <p>
                                        Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:
                                        <br />
                                        <strong>{legalSettings?.legal_form === 'individual' ? (legalSettings?.owner_name || legalSettings?.company_name || schoolName) : (legalSettings?.company_name || schoolName)}</strong><br />
                                        {legalSettings?.street} {legalSettings?.house_number}<br />
                                        {legalSettings?.zip_code} {legalSettings?.city}<br />
                                        {legalSettings?.email_public}<br />
                                        {legalSettings?.phone}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Bereitstellung der App und Auftragsverarbeitung */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Server size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>2. Bereitstellung der App und Auftragsverarbeitung</h2>
                                    <p>
                                        Um Ihnen diese App und die damit verbundenen Funktionen (Terminbuchung, Chat, Verwaltung) zur Verfügung zu stellen, bedienen wir uns eines technischen Dienstleisters (App-Entwickler und Host), der die Plattform in unserem Auftrag betreibt:
                                        <br />
                                        <strong>[Ihr Firmenname / Ihr Name]</strong><br />
                                        [Ihre Adresse]
                                        <br /><br />
                                        Wir haben mit diesem Dienstleister einen Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO geschlossen. Die Daten werden verschlüsselt auf Servern in der Europäischen Union (Frankfurt am Main, Deutschland) gehostet (Hosting-Partner: Vercel Inc. und Supabase).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Welche Daten wir verarbeiten */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Database size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>3. Welche Daten wir verarbeiten und zu welchem Zweck</h2>
                                    <p>
                                        Wenn Sie unsere App nutzen, verarbeiten wir personenbezogene Daten, die für die Erfüllung unseres Vertrages (Art. 6 Abs. 1 lit. b DSGVO) über das Hundetraining und die Nutzung der App-Funktionen erforderlich sind. Im Detail erfassen wir:
                                    </p>
                                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <li><strong>Stammdaten & Kontaktdaten:</strong> Vorname, Nachname, E-Mail-Adresse, Telefonnummer sowie Ihr verschlüsseltes Passwort (Auth-ID).</li>
                                        <li><strong>Hundedaten:</strong> Name des Hundes, Rasse, Geburtsdatum, Chipnummer, Trainingsstand (Levels) und hochgeladene Bilder Ihres Hundes.</li>
                                        <li><strong>Buchungs- und Termindaten:</strong> Von Ihnen gebuchte Kurse, Termine, Teilnahmen (Anwesenheit) und zugehörige Trainingsstände (Achievements).</li>
                                        <li><strong>Finanz- und Transaktionsdaten:</strong> Ihr aktuelles Guthaben (Balance), Rechnungsnummern sowie Auflade- und Buchungshistorie.</li>
                                        <li><strong>Dokumente:</strong> Von uns oder Ihnen hochgeladene Dateien (z.B. Trainingspläne, Rechnungen).</li>
                                        <li><strong>Kommunikationsdaten (Chat):</strong> Nachrichten, die Sie über das integrierte Chat-System mit unseren Trainern austauschen. Diese werden zur Sicherstellung der Kundenbetreuung serverseitig in der EU gespeichert.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 4. Zahlungsabwicklung */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <CreditCard size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>4. Zahlungsabwicklung (Stripe)</h2>
                                    <p>
                                        Wenn Sie in der App Guthaben aufladen oder kostenpflichtige Kurse buchen, nutzen wir für die sichere Zahlungsabwicklung den Zahlungsdienstleister Stripe (Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland).
                                        <br /><br />
                                        Wenn Sie eine Zahlung vornehmen, werden die hierfür erforderlichen Daten (z.B. Name, Betrag, Zahlungsinformationen) direkt über eine sichere Verbindung an Stripe übermittelt. Die Rechtsgrundlage für die Weitergabe der Daten ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
                                        <br /><br />
                                        <strong>Hinweis auf Drittlandtransfer:</strong> Stripe verarbeitet Daten teilweise auf Servern in den USA. Die Datenübermittlung ist durch Standardvertragsklauseln (SCC) der EU-Kommission abgesichert.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 5. System-E-Mails und Push-Benachrichtigungen */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Bell size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>5. System-E-Mails und Push-Benachrichtigungen</h2>
                                    <p>
                                        <strong>E-Mails:</strong> Für den Versand von wichtigen System-E-Mails (z.B. Passwort-Reset, Buchungsbestätigungen) nutzen wir den Dienstleister Resend (Resend, Inc.). Hierbei wird Ihre E-Mail-Adresse an Resend übermittelt.
                                        <br /><br />
                                        <strong>Push-Benachrichtigungen:</strong> Wenn Sie dies in den App-Einstellungen oder in Ihrem Gerät explizit aktivieren (Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO), senden wir Ihnen Push-Benachrichtigungen (z.B. Terminerinnerungen oder neue Chat-Nachrichten). Hierfür speichern wir einen anonymen Push-Token (Endpoint, p256dh, auth). Sie können diese Benachrichtigungen jederzeit in der App oder den Systemeinstellungen Ihres Smartphones deaktivieren.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 6. Technische Zugriffsdaten und Nutzungsanalyse */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Info size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>6. Technische Zugriffsdaten und Nutzungsanalyse</h2>
                                    <p>
                                        <strong>Technische Logs:</strong> Bei jedem Aufruf der App werden aus technischen Gründen (Betriebssicherheit, Fehlerbehebung) automatisch Zugriffsdaten (wie IP-Adresse, Zeitpunkt des Zugriffs) auf den Servern (Vercel/Supabase) verarbeitet. Dies basiert auf unserem berechtigten Interesse (Art. 6 Abs. 1 lit. f DSGVO) an einem sicheren Betrieb der App.
                                        <br /><br />
                                        <strong>Analyse-Tools:</strong> (Vorsorglicher Hinweis) Soweit wir in der App Tools zur pseudonymisierten Analyse des Nutzerverhaltens einsetzen, um Fehler zu finden und die App zu verbessern, geschieht dies ausschließlich nach Ihrer ausdrücklichen vorherigen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie beim ersten Start der App oder in den Einstellungen erteilen und jederzeit widerrufen können. Ohne Ihre Einwilligung findet kein nicht-notwendiges Tracking statt.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 7. Speicherdauer und Löschung */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Trash2 size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>7. Speicherdauer und Löschung</h2>
                                    <p>
                                        Ihre Daten werden nur so lange gespeichert, wie es für die Erfüllung der oben genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen (z.B. 10 Jahre für Rechnungen und Transaktionsdaten nach dem HGB/AO) dies verlangen.
                                        <br /><br />
                                        Sie können jederzeit die Löschung Ihres Accounts und der damit verbundenen Daten bei uns anfragen. Daten, die keinen gesetzlichen Aufbewahrungsfristen unterliegen (z.B. Hundedaten, Chatverläufe), werden wir daraufhin unverzüglich löschen.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 8. Ihre Rechte als Betroffener */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <FileText size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>8. Ihre Rechte als Betroffener</h2>
                                    <p>
                                        Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf:
                                    </p>
                                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <li><strong>Unentgeltliche Auskunft</strong> über Ihre gespeicherten personenbezogenen Daten (Art. 15 DSGVO).</li>
                                        <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO).</li>
                                        <li><strong>Löschung</strong> Ihrer Daten, sofern keine gesetzlichen Pflichten entgegenstehen (Art. 17 DSGVO).</li>
                                        <li><strong>Einschränkung</strong> der Datenverarbeitung (Art. 18 DSGVO).</li>
                                        <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO).</li>
                                        <li><strong>Widerruf</strong> erteilter Einwilligungen für die Zukunft (z.B. Push-Benachrichtigungen).</li>
                                        <li><strong>Beschwerde</strong> bei der zuständigen Datenschutzaufsichtsbehörde.</li>
                                    </ul>
                                    <p style={{ marginTop: '1rem' }}>
                                        Um Ihre Rechte auszuüben, kontaktieren Sie uns bitte über die oben (unter Punkt 1) angegebenen Kontaktdaten.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </main>
    );
}