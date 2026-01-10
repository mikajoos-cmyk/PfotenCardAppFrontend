import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Mail, Phone, ArrowLeft } from 'lucide-react';
import Icon from '../../components/ui/Icon';

interface ImpressumPageProps {
    onBack?: () => void;
    showBack?: boolean;
}

export function ImpressumPage({ onBack, showBack = true }: ImpressumPageProps) {
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
                        <h1>Impressum</h1>
                    </div>

                    <div className="bg-card">
                        <h2>Angaben gemäß § 5 TMG</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Building2 size={24} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h3>Firmenanschrift</h3>
                                    <p>
                                        Pfotencard GmbH<br />
                                        Musterstraße 123<br />
                                        12345 Musterstadt<br />
                                        Deutschland
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <Mail size={24} className="text-primary" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <h3>Kontakt</h3>
                                    <p>
                                        E-Mail: <a href="mailto:info@pfotencard.de">info@pfotencard.de</a><br />
                                        Telefon: <a href="tel:+491234567890">+49 123 456 7890</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card">
                        <h2>Vertreten durch</h2>
                        <p>Geschäftsführer: Max Mustermann</p>
                    </div>

                    <div className="bg-card">
                        <h2>Registereintrag</h2>
                        <p>
                            Eintragung im Handelsregister<br />
                            Registergericht: Amtsgericht Musterstadt<br />
                            Registernummer: HRB 12345
                        </p>
                    </div>

                    <div className="bg-card">
                        <h2>Umsatzsteuer-ID</h2>
                        <p>
                            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                            DE123456789
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
