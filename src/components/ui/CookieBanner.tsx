import React, { useState, useEffect } from 'react';

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consented = localStorage.getItem('cookie-consent-seen');
        if (!consented) {
            // Kleine Verzögerung für die Animation
            setTimeout(() => setIsVisible(true), 500);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent-seen', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="cookie-banner">
            <div className="cookie-content">
                <div className="cookie-text">
                    <strong>Wir nutzen technisch notwendige Cookies.</strong><br />
                    Diese sind für die sichere Anmeldung und Funktion der App erforderlich. Wir setzen keine Werbe-Tracker ein.
                    <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/datenschutz'; }} className="cookie-link">
                        Mehr erfahren
                    </a>
                </div>
                <button onClick={handleAccept} className="button button-primary cookie-button">
                    Verstanden
                </button>
            </div>
        </div>
    );
}