import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserCheck, FileText, Server, CreditCard, ArrowLeft } from 'lucide-react';
import Icon from '../../components/ui/Icon';

interface DatenschutzPageProps {
    onBack?: () => void;
    showBack?: boolean;
}

export function DatenschutzPage({ onBack, showBack = true }: DatenschutzPageProps) {
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
                        Stand: Januar 2026. Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* 1. Verantwortliche Stelle */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <UserCheck size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>1. Verantwortliche Stelle</h2>
                                    <p>
                                        Verantwortlich für die Datenverarbeitung ist Ihre <strong>Hundeschule</strong> (siehe Impressum der App oder Website).
                                        <br />
                                        Wir (Pfotencard) agieren als technischer Auftragsverarbeiter gemäß Art. 28 DSGVO.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Hosting */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Server size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>2. Hosting & Infrastruktur</h2>
                                    <p>
                                        Unsere Server (Supabase/AWS) befinden sich vorrangig in <strong>Frankfurt (Deutschland)</strong>.
                                        Daten werden verschlüsselt übertragen (SSL/TLS).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Drittanbieter */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Database size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>3. Drittanbieter & Datentransfer</h2>
                                    <p>
                                        Wir nutzen Dienstleister für Login und Hosting, die ihren Sitz teilweise in den USA haben (z.B. Vercel, Supabase Inc.).
                                        <br />
                                        <strong>Schutzgarantie:</strong> Wir arbeiten nur mit Anbietern, die nach dem <em>EU-US Data Privacy Framework (DPF)</em> zertifiziert sind oder EU-Standardvertragsklauseln (SCC) unterzeichnet haben.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Rechte */}
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <FileText size={28} className="text-primary" style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                                <div>
                                    <h2>4. Deine Rechte</h2>
                                    <p>
                                        Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten.
                                        Wende dich dazu bitte direkt an deine Hundeschule oder nutze die "Account löschen"-Funktion in den Einstellungen.
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