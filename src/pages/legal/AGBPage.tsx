import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, ShieldCheck, ArrowLeft } from 'lucide-react';
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
                        <h1>AGB / Nutzungsbedingungen</h1>
                    </div>

                    <p style={{ fontSize: '1.25rem', marginBottom: '3rem' }}>
                        Nutzungsbedingungen für die Pfotencard App (B2C). Stand: 01.01.2026
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <Scale size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 1 Vertragsgegenstand</h2>
                                    <p>
                                        Pfotencard bietet eine App zur Verwaltung von Trainingsfortschritten, Terminen und Guthaben bei Ihrer Hundeschule.
                                    </p>
                                    <p>
                                        Der Vertrag über die eigentlichen Trainingsleistungen besteht ausschließlich zwischen Ihnen und Ihrer Hundeschule. Pfotencard ist technischer Dienstleister.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <FileText size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 2 Nutzung der App</h2>
                                    <p>
                                        Die Nutzung der App ist für Sie als Hundehalter in der Regel kostenlos (sofern nicht anders mit Ihrer Hundeschule vereinbart).
                                    </p>
                                    <p>
                                        Sie sind verpflichtet, Ihre Zugangsdaten sicher zu verwahren und die App nur bestimmungsgemäß zu nutzen.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                                <ShieldCheck size={32} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h2>§ 3 Haftung</h2>
                                    <p>
                                        Pfotencard haftet für die technische Verfügbarkeit der App im Rahmen der üblichen Standards. Eine Haftung für die Inhalte oder den Erfolg des Hundetrainings ist ausgeschlossen.
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
