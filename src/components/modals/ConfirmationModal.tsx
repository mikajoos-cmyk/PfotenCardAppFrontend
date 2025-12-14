
import React, { FC } from 'react';
import Icon from '../ui/Icon';

interface ConfirmationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel, confirmText = 'Bestätigen', cancelText = 'Abbrechen', isDestructive = false }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className={`modal-header ${isDestructive ? 'red' : 'blue'}`}>
                <h2>{title}</h2>
                <button className="close-button" onClick={onCancel}><Icon name="x" /></button>
            </div>
            <div className="modal-body">
                <p>{message}</p>
            </div>
            <div className="modal-footer">
                <button className="button button-outline" onClick={onCancel}>{cancelText}</button>
                <button className={`button ${isDestructive ? 'button-destructive' : 'button-primary'}`} onClick={onConfirm}>{confirmText}</button>
            </div>
        </div>
    </div>
);

export default ConfirmationModal;
