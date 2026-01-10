import { useState, useEffect } from 'react';

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

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
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] animate-in slide-in-from-bottom duration-500">
            <div className="max-w-4xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-lg border border-slate-200 dark:border-slate-800 rounded-lg p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                <div className="text-sm text-slate-600 dark:text-slate-300 pr-8">
                    <p>
                        <strong>Wir nutzen Cookies und lokale Speichertechnologien.</strong><br />
                        Diese sind für die Funktion der App (Login, Sicherheit, Zahlungsabwicklung) notwendig.
                        Wir setzen keine Werbe-Tracker ein.
                        <a href="/datenschutz" className="underline hover:text-green-600 ml-1">
                            Mehr erfahren
                        </a>
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Optional: Schließen-X für ganz Minimalistische */}
                    {/* <button onClick={handleAccept} className="text-slate-400 hover:text-slate-600"><X size={20} /></button> */}

                    <button
                        onClick={handleAccept}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                    >
                        Verstanden
                    </button>
                </div>
            </div>
        </div>
    );
}
