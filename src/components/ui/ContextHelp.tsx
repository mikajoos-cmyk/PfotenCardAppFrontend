import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Mail, ShieldAlert, X, LifeBuoy } from 'lucide-react';
import { HELP_CONTENT } from '../../lib/helpContent';
import Icon from './Icon';

interface ContextHelpProps {
    currentPage: string;
    userRole: 'admin' | 'mitarbeiter' | 'customer' | 'kunde';
    tenantSupportEmail?: string;
}

export const ContextHelp: React.FC<ContextHelpProps> = ({
    currentPage,
    userRole,
    tenantSupportEmail
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const content = HELP_CONTENT[currentPage] || {
        title: "Hilfe",
        text: "Brauchst du Unterstützung? Hier findest du Informationen zu dieser Seite."
    };

    const isStaff = userRole === 'admin' || userRole === 'mitarbeiter';

    // Nutzt exakt die gleichen Klassen wie die anderen Modals (z.B. InfoModal)
    const modalContent = (
        <div className="modal-overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 9999 }}>
            <div className="modal-content info-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>

                {/* Header im App-Stil */}
                <div className="modal-header blue">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <LifeBuoy color="white" size={24} />
                        <h2 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>{content.title} Hilfe</h2>
                    </div>
                    <button className="close-button" onClick={() => setIsOpen(false)}>
                        <Icon name="x" />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body scrollable">
                    <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem', fontStyle: 'italic', borderLeft: '3px solid var(--border-color)', paddingLeft: '1rem' }}>
                        {content.text}
                    </p>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                            Support-Kontakt
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {isStaff ? (
                                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-accent-blue)', borderRadius: '0.5rem', border: '1px solid var(--text-accent-blue)' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Technischer Support (Pfotencard):</p>
                                    <a href="mailto:support@pfotencard.de" style={{ color: 'var(--brand-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                        <Mail size={16} /> support@pfotencard.de
                                    </a>
                                </div>
                            ) : (
                                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-accent-green)', borderRadius: '0.5rem', border: '1px solid var(--text-accent-green)' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Fragen an deine Hundeschule:</p>
                                    <a href={`mailto:${tenantSupportEmail || 'info@pfotencard.de'}`} style={{ color: 'var(--brand-green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                        <Mail size={16} /> {tenantSupportEmail || "E-Mail wird geladen..."}
                                    </a>
                                </div>
                            )}

                            {/* DSA Sektion */}
                            <div style={{ padding: '1rem', backgroundColor: 'var(--danger-bg-light)', borderRadius: '0.5rem', border: '1px solid var(--brand-red)' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-red)', marginBottom: '0.25rem' }}>Missbrauch melden (DSA):</p>
                                <a href="mailto:abuse@pfotencard.de" style={{ color: 'var(--brand-red)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
                                    <ShieldAlert size={16} /> abuse@pfotencard.de
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="button button-outline" onClick={() => setIsOpen(false)}>
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );

    // Der Button ist jetzt transparent und schlicht, fixiert oben rechts im Content
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="context-help-trigger"
                aria-label="Hilfe öffnen"
                title="Hilfe anzeigen"
            >
                <HelpCircle size={24} />
            </button>

            {isOpen && mounted && createPortal(modalContent, document.body)}
        </>
    );
};