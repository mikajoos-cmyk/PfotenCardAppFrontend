import React, { FC, useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { AppStatus } from '../../types';

interface LiveStatusModalProps {
    currentStatus: AppStatus | null;
    onClose: () => void;
    onSave: (status: 'active' | 'cancelled' | 'partial', message: string) => void;
}

const LiveStatusModal: FC<LiveStatusModalProps> = ({ currentStatus, onClose, onSave }) => {
    const [status, setStatus] = useState<'active' | 'cancelled' | 'partial'>('active');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (currentStatus) {
            setStatus(currentStatus.status);
            setMessage(currentStatus.message || '');
        }
    }, [currentStatus]);

    const handleSubmit = () => {
        onSave(status, message);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header blue">
                    <h2>Globalen Status setzen</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        Dieser Status wird auf dem Dashboard und der Terminseite für alle Nutzer angezeigt.
                    </p>

                    <div className="status-selection-row">
                        <button
                            className={`status-selection-btn ${status === 'active' ? 'active status-active' : ''}`}
                            onClick={() => setStatus('active')}
                        >
                            Aktiv
                        </button>
                        <button
                            className={`status-selection-btn ${status === 'partial' ? 'active status-partial' : ''}`}
                            onClick={() => setStatus('partial')}
                        >
                            Eingeschränkt
                        </button>
                        <button
                            className={`status-selection-btn ${status === 'cancelled' ? 'active status-cancelled' : ''}`}
                            onClick={() => setStatus('cancelled')}
                        >
                            Unterbrochen
                        </button>
                    </div>

                    <div className="form-group">
                        <label>Zusätzliche Informationen (Optional)</label>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="z.B. Genauere Infos zu Absagen oder Ausnahmen..."
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>Abbrechen</button>
                    <button className="button button-primary" onClick={handleSubmit}>Status speichern</button>
                </div>
            </div>
        </div>
    );
};

export default LiveStatusModal;
