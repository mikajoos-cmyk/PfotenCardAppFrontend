import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Mail, Phone, ArrowLeft } from 'lucide-react';
import Icon from '../../components/ui/Icon';

interface ImpressumPageProps {
    onBack?: () => void;
    showBack?: boolean;
    legalSettings?: any;
    schoolName?: string;
}

export function ImpressumPage({ onBack, showBack = true, legalSettings, schoolName }: ImpressumPageProps) {
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
                        <h2>Anbieter der Inhalte</h2>
                        <p>
                            Anbieter der Inhalte und vertraglicher Ansprechpartner für das Hundetraining gemäß § 5 DDG:
                        </p>
                        <p style={{ marginTop: '1rem' }}>
                            <strong>{legalSettings?.legal_form === 'individual' ? (legalSettings?.owner_name || legalSettings?.company_name || schoolName) : (legalSettings?.company_name || schoolName)}</strong><br />
                            {legalSettings?.street} {legalSettings?.house_number}<br />
                            {legalSettings?.zip_code} {legalSettings?.city}
                        </p>
                    </div>

                    <div className="bg-card">
                        <h2>Vertreten durch</h2>
                        <p>{legalSettings?.legal_form === 'individual' ? (legalSettings?.owner_name) : (legalSettings?.representative)}</p>
                    </div>

                    <div className="bg-card">
                        <h2>Kontakt</h2>
                        <p>
                            Telefon: {legalSettings?.phone}<br />
                            E-Mail: {legalSettings?.email_public}
                        </p>
                    </div>

                    {legalSettings?.has_vat_id && (
                        <div className="bg-card">
                            <h2>Umsatzsteuer-ID</h2>
                            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:</p>
                            <p>{legalSettings?.vat_id}</p>
                        </div>
                    )}

                    {legalSettings?.supervisory_authority && (
                        <div className="bg-card">
                            <h2>Aufsichtsbehörde</h2>
                            <p>(Erlaubnis nach § 11 Tierschutzgesetz)</p>
                            <p>{legalSettings?.supervisory_authority}</p>
                        </div>
                    )}

                    <div className="bg-card">
                        <h2>Technische Bereitstellung und Plattformbetrieb</h2>
                        <p>Diese App wird technisch bereitgestellt von:</p>
                        <p style={{ marginTop: '1rem' }}>
                            <strong>[Ihr Firmenname / Ihr Name]</strong><br />
                            [Ihre Straße und Hausnummer]<br />
                            [Ihre PLZ und Ort]<br />
                            E-Mail: [Ihre Support-E-Mail]
                        </p>
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            (Hinweis: Der Plattformbetreiber ist nicht Vertragspartner für das Hundetraining.)
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
