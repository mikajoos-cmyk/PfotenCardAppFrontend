import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, ShieldCheck, ArrowLeft, User, CreditCard, MessageSquare, AlertCircle, Info, Gavel } from 'lucide-react';
import Icon from '../../components/ui/Icon';

interface AGBPageProps {
    onBack?: () => void;
    showBack?: boolean;
}

export function AGBPage({ onBack, showBack = true }: AGBPageProps) {
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
                        <button
                            onClick={onBack}
                            className="back-button"
                        >
                            <ArrowLeft size={20} />
                            Zurück
                        </button>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="text-primary">
                            <Icon name="file" width={48} height={48} />
                        </div>
                        <div>
                            <h1>Allgemeine Nutzungs- und Geschäftsbedingungen (App-AGB)</h1>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                                (Für die Hundehalter / Endkunden in der App)
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* § 1 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <Scale size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 1 Geltungsbereich und Vertragspartner</h2>
                                    <p>
                                        (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) gelten für die Nutzung dieser App sowie für alle darüber abgeschlossenen Verträge (z. B. Kursbuchungen, Einzeltrainings, Guthabenaufladungen).
                                    </p>
                                    <p>
                                        (2) Ihr Vertragspartner für alle gebuchten Dienstleistungen (Hundetraining) ist ausschließlich die von Ihnen ausgewählte Hundeschule (nachfolgend „Hundeschule“ oder „wir“).
                                    </p>
                                    <p>
                                        (3) Die App selbst wird von einem technischen Dienstleister (Plattformbetreiber) zur Verfügung gestellt. Der Plattformbetreiber wird nicht Vertragspartner der über die App gebuchten Leistungen, sondern stellt lediglich die technische Infrastruktur (Software-as-a-Service) zur Verfügung.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 2 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <User size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 2 Registrierung und Nutzerkonto</h2>
                                    <p>
                                        (1) Die Nutzung der App erfordert eine Registrierung. Der Nutzer verpflichtet sich, die erforderlichen Daten (Name, E-Mail, Hundedaten) wahrheitsgemäß und vollständig anzugeben.
                                    </p>
                                    <p>
                                        (2) Der Nutzer ist für die Geheimhaltung seiner Zugangsdaten verantwortlich und hat jeden unbefugten Zugriff Dritter unverzüglich zu melden.
                                    </p>
                                    <p>
                                        (3) Ein Anspruch auf die Nutzung der App besteht nicht. Die Hundeschule behält sich vor, Nutzerkonten bei Verstößen gegen diese AGB (z. B. grobes Fehlverhalten im Chat) temporär oder dauerhaft zu sperren.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 3 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <CreditCard size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 3 Vertragsschluss, Buchungen und Guthaben</h2>
                                    <p>
                                        (1) Die in der App dargestellten Kurse und Termine stellen ein verbindliches Angebot der Hundeschule dar. Der Vertrag kommt zustande, sobald der Nutzer den Button „Kostenpflichtig buchen“ (oder vergleichbar) klickt.
                                    </p>
                                    <p>
                                        (2) Soweit in der App angeboten, kann der Nutzer über den integrierten Zahlungsdienstleister (Stripe) Guthaben aufladen. Dieses Guthaben ist an die jeweilige Hundeschule gebunden und kann nur für deren Dienstleistungen verwendet werden. Eine Auszahlung von Restguthaben erfolgt nur nach individueller Absprache oder bei gesetzlicher Verpflichtung.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 4 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <AlertCircle size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 4 Stornierungen und Absagen (Individuelle Bedingungen)</h2>
                                    <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        (Hinweis an den Anwalt: Dies ist der dynamische Verweis auf die Einstellungen der Software)
                                    </p>
                                    <p>
                                        (1) Für die Stornierung von gebuchten Kursen, Terminen oder Einzelstunden gelten die individuellen Stornierungsbedingungen der jeweiligen Hundeschule.
                                    </p>
                                    <p>
                                        (2) Diese spezifischen Stornierungsfristen und -bedingungen (z. B. kostenfreie Stornierung bis 24 Stunden vor Beginn, anteilige Einbehaltung von Gebühren) werden dem Nutzer im Profil der Hundeschule sowie während des Buchungsprozesses transparent angezeigt, bevor die Buchung verbindlich abgeschlossen wird.
                                    </p>
                                    <p>
                                        (3) Mit Abschluss der Buchung akzeptiert der Nutzer die für den jeweiligen Termin ausgewiesenen Stornierungsbedingungen.
                                    </p>
                                    <p>
                                        (4) Eine Stornierung kann, sofern die Frist noch nicht abgelaufen ist, direkt über die entsprechende Funktion in der App (z.B. „Termin stornieren“) vorgenommen werden. Etwaig gezahltes Guthaben wird entsprechend den angezeigten Bedingungen automatisch dem In-App-Konto gutgeschrieben.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 5 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <MessageSquare size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 5 Nutzung des Chat-Systems und Verhaltensregeln</h2>
                                    <p>
                                        (1) Die App bietet ein internes Chat-System zur Kommunikation zwischen dem Nutzer und den Trainern der Hundeschule.
                                    </p>
                                    <p>
                                        (2) Der Chat dient ausschließlich der vertragsbezogenen Kommunikation (z. B. Fragen zum Training, Terminabsprachen, Austausch von Dokumenten).
                                    </p>
                                    <p>
                                        (3) Der Nutzer verpflichtet sich, im Chat einen respektvollen Umgangston zu wahren. Es ist untersagt, rechtswidrige, beleidigende, rassistische oder pornografische Inhalte zu teilen.
                                    </p>
                                    <p>
                                        (4) Bei Zuwiderhandlungen ist die Hundeschule berechtigt, Nachrichten zu löschen und den Nutzer temporär oder dauerhaft vom Chat oder der App-Nutzung auszuschließen.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 6 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <ShieldCheck size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 6 Haftung der Hundeschule</h2>
                                    <p>
                                        (1) Die Hundeschule haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie bei Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
                                    </p>
                                    <p>
                                        (2) Für leichte Fahrlässigkeit haftet die Hundeschule nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht. Die Haftung ist in diesem Fall auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
                                    </p>
                                    <p>
                                        (3) Eine Haftung für die ständige und ununterbrochene technische Verfügbarkeit der App kann nicht übernommen werden, da diese von der Internetverbindung und den Servern des Plattformbetreibers abhängig ist.
                                    </p>
                                    <p>
                                        (4) Die Teilnahme am Hundetraining erfolgt auf eigene Gefahr. Der Nutzer haftet für alle von ihm und/oder seinem Hund verursachten Schäden nach den gesetzlichen Bestimmungen (Tierhalterhaftung).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 7 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <Info size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 7 Datenschutz</h2>
                                    <p>
                                        Die Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung, die in der App jederzeit einsehbar ist.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* § 8 */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <Gavel size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 8 Schlussbestimmungen</h2>
                                    <p>
                                        (1) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
                                    </p>
                                    <p>
                                        (2) Es gilt das Recht der Bundesrepublik Deutschland.
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
