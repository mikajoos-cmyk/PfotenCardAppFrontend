
import React, { FC } from 'react';
import Icon from '../ui/Icon';

interface InfoModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    color?: string;
}

const InfoModal: FC<InfoModalProps> = ({ title, onClose, children, color = 'blue' }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className={`modal-header ${color}`}>
                <h2>{title}</h2>
                <button className="close-button" onClick={onClose}><Icon name="x" /></button>
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
