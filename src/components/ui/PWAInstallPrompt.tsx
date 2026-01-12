import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const PWAInstallPrompt: React.FC<{ primaryColor: string }> = ({ primaryColor }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other' | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Check if user dismissed it recently
        const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
        const now = Date.now();
        if (lastDismissed && now - parseInt(lastDismissed) < 1000 * 60 * 60 * 24 * 7) { // 7 days
            return;
        }

        // Platform detection
        const ua = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform('ios');
            // Show iOS prompt after a short delay
            setTimeout(() => setIsVisible(true), 3000);
        } else if (/android/.test(ua)) {
            setPlatform('android');
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setPlatform('android');
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="pwa-prompt-overlay">
            <div className="pwa-prompt-card">
                <button className="pwa-close" onClick={handleDismiss}>
                    <Icon name="x" width={20} height={20} />
                </button>

                <div className="pwa-icon-container" style={{ backgroundColor: primaryColor }}>
                    <Icon name="paw" color="white" width={32} height={32} />
                </div>

                <h3>App auf dem Handy installieren</h3>
                <p>Nutze die PfotenCard wie eine echte App für einen schnelleren Zugriff.</p>

                {platform === 'android' ? (
                    <button
                        className="button button-primary pwa-install-button"
                        onClick={handleInstallClick}
                        style={{ backgroundColor: primaryColor }}
                    >
                        Installieren
                    </button>
                ) : platform === 'ios' ? (
                    <div className="ios-instructions">
                        <div className="ios-step">
                            <span className="step-number">1</span>
                            <span>Tippe auf das <strong>Teilen-Icon</strong> (Viereck mit Pfeil) unten im Browser.</span>
                        </div>
                        <div className="ios-step">
                            <span className="step-number">2</span>
                            <span>Wähle <strong>"Zum Home-Bildschirm"</strong> aus dem Menü.</span>
                        </div>
                    </div>
                ) : (
                    <p className="pwa-fallback-text">Öffne die Browsereinstellungen und wähle "App installieren" oder "Zum Startbildschirm hinzufügen".</p>
                )}
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
