
import React, { FC, useState, useEffect } from 'react';
import Icon from '../ui/Icon';

const OnlineStatus: FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastSyncText, setLastSyncText] = useState('nie');

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setLastSyncText('Gerade eben');
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (isOnline) {
            setLastSyncText('Gerade eben');
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isOnline]);

    return (
        <div className="status-indicator">
            <div className={`status-item online-status ${isOnline ? 'online' : 'offline'}`}>
                <Icon name="wifi" />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {isOnline && (
                <div className="status-item sync-status">
                    <Icon name="refresh" />
                    <span>Sync: {lastSyncText}</span>
                </div>
            )}
        </div>
    );
};

export default OnlineStatus;
