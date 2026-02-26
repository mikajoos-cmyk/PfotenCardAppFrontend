
import React, { FC } from 'react';
import Icon from '../ui/Icon';

interface InfoModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    color?: string;
}

const InfoModal: FC<InfoModalProps> = ({ title, onClose, children, color = 'blue' }) => (
    <div
        className="modal-overlay"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
    >
        <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', zIndex: 10001 }}
        >
            <div className={`modal-header ${color}`}>
                <h2 id="info-modal-title">{title}</h2>
                <button className="close-button" onClick={onClose} aria-label="Schließen"><Icon name="x" /></button>
            </div>
            <div className="modal-body">
                {children}
            </div>
            <div className="modal-footer">
                <button className="button button-outline" onClick={onClose}>Schließen</button>
            </div>
        </div>
    </div>
);

export default InfoModal;
