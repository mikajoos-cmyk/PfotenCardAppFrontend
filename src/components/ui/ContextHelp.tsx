import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Mail, ShieldAlert, X, LifeBuoy } from 'lucide-react';
import { HELP_CONTENT } from '../../lib/helpContent';

interface ContextHelpProps {
    currentPage: string;
    userRole: 'admin' | 'employee' | 'customer';
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

    const isStaff = userRole === 'admin' || userRole === 'employee';

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed' }}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <LifeBuoy className="text-primary" size={20} />
                        <h2 className="text-base font-bold text-foreground">{content.title} Hilfe</h2>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-foreground">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
                    <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
                        {content.text}
                    </p>

                    <div className="space-y-3 pt-4 border-t border-border">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Support-Kontakt</p>

                        {isStaff ? (
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 mb-1">Technischer Support (Pfotencard):</p>
                                <a href="mailto:support@pfotencard.de" className="text-sm text-primary hover:underline flex items-center gap-2">
                                    <Mail size={14} /> support@pfotencard.de
                                </a>
                            </div>
                        ) : (
                            <div className="p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                                <p className="text-[11px] font-semibold text-green-800 dark:text-green-300 mb-1">Fragen an deine Hundeschule:</p>
                                <a href={`mailto:${tenantSupportEmail || 'info@pfotencard.de'}`} className="text-sm text-primary hover:underline flex items-center gap-2">
                                    <Mail size={14} /> {tenantSupportEmail || "E-Mail wird geladen..."}
                                </a>
                            </div>
                        )}

                        {/* DSA Sektion */}
                        <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                            <p className="text-[11px] font-semibold text-red-800 dark:text-red-400 mb-1">Missbrauch melden (DSA):</p>
                            <a href="mailto:abuse@pfotencard.de" className="text-xs text-red-600 hover:underline flex items-center gap-2">
                                <ShieldAlert size={14} /> abuse@pfotencard.de
                            </a>
                        </div>
                    </div>
                </div>

                <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/30 border-t border-border">
                    <button onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
                        Fenster schließen
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 z-[9999] p-1 text-primary hover:opacity-80 transition-opacity"
                aria-label="Hilfe öffnen"
                style={{ position: 'fixed', top: '1rem', right: '1rem' }}
            >
                <HelpCircle size={24} />
            </button>

            {isOpen && mounted && createPortal(modalContent, document.body)}
        </>
    );
};
