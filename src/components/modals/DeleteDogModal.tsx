
import React, { FC } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface DeleteDogModalProps {
    dog: any;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteDogModal: FC<DeleteDogModalProps> = ({ dog, onClose, onConfirm }) => (
    <ConfirmationModal
        title="Hund löschen"
        message={`Möchten Sie den Hund "${dog.name}" wirklich löschen?`}
        onConfirm={onConfirm}
        onCancel={onClose}
        confirmText="Löschen"
        isDestructive={true}
    />
);

export default DeleteDogModal;
