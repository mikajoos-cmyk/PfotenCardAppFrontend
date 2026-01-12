import React, { FC } from 'react';
import { AppStatus } from '../../types';

interface LiveStatusBannerProps {
    statusData: AppStatus | null;
}

const LiveStatusBanner: FC<LiveStatusBannerProps> = ({ statusData }) => {
    if (!statusData || !statusData.status) {
        return null;
    }

    const isCancelled = statusData.status === 'cancelled';
    const isPartial = statusData.status === 'partial';
    const bannerClass = `status-banner ${isCancelled ? 'is-cancelled' : isPartial ? 'is-partial' : 'is-active'}`;
    const defaultMessage = isCancelled
        ? 'Die Hundeschule fällt aus.'
        : isPartial
            ? 'Einschränkungen im Betrieb. Bitte Details beachten.'
            : 'Alle Stunden finden wie geplant statt.';

    // Icons direkt eingebettet für exaktes Aussehen wie im Original
    const CheckIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
    const CrossIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    );
    const WarningIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
        </svg>
    );

    return (
        <div className={bannerClass} role="alert">
            {isCancelled ? <CrossIcon /> : isPartial ? <WarningIcon /> : <CheckIcon />}
            <div className="status-banner-content">
                <h4 className="status-banner-headline">{defaultMessage}</h4>
                {statusData.message && <p className="status-banner-message">{statusData.message}</p>}
                <p className="status-banner-time">
                    Stand: {new Date(statusData.updated_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} Uhr
                </p>
            </div>
        </div>
    );
};

export default LiveStatusBanner;
