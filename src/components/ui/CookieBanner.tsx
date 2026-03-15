import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Prüfen, ob der Hinweis schon bestätigt wurde
        const consented = localStorage.getItem('cookie-consent-seen');
        if (!consented) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent-seen', 'true');
        setIsVisible(false);
        // Event auslösen, damit Stripe geladen werden kann
        window.dispatchEvent(new Event('cookie-consent-updated'));
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] animate-in slide-in-from-bottom duration-500">
            <div className="max-w-4xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-lg border border-slate-200 dark:border-slate-800 rounded-lg p-4 md:p-5 flex flex-col items-stretch gap-4">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300 pr-8">
                        <p>
                            <strong>Wir nutzen Cookies und lokale Speichertechnologien.</strong><br />
                            Diese sind für die Funktion der App (Login, Sicherheit, Zahlungsabwicklung) notwendig.
                            Wir setzen keine Werbe-Tracker ein.
                            <button 
                                onClick={() => setShowDetails(!showDetails)}
                                className="underline hover:text-green-600 ml-1 text-xs font-medium"
                            >
                                {showDetails ? "Weniger anzeigen" : "Details anzeigen"}
                            </button>
                            <a href="/datenschutz" className="underline hover:text-green-600 ml-2 text-xs">
                                Datenschutzerklärung
                            </a>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <button
                            onClick={handleAccept}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-6 rounded-md transition-colors shadow-sm"
                        >
                            Alle akzeptieren
                        </button>
                    </div>
                </div>

                {showDetails && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 border-t pt-3 mt-1 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold mb-1 text-slate-700 dark:text-slate-200">Notwendige Cookies</h4>
                                <p>Diese Technologien sind für Kernfunktionen wie Sicherheit, Netzwerkverwaltung und Barrierefreiheit erforderlich. Sie können nicht deaktiviert werden.</p>
                                <ul className="list-disc list-inside mt-1 ml-1">
                                    <li>Authentifizierung (Login-Status)</li>
                                    <li>Sicherheit & Betrugsprävention</li>
                                    <li>Zahlungsabwicklung (Stripe)</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-1 text-slate-700 dark:text-slate-200">Stripe (Zahlungsdienstleister)</h4>
                                <p>Stripe verwendet Cookies, um Zahlungen sicher abzuwickeln und Betrug zu verhindern. Stripe-Skripte werden erst nach Ihrer Zustimmung geladen.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
