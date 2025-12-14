
import React, { FC } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface DeleteDocumentModalProps {
    document: any;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteDocumentModal: FC<DeleteDocumentModalProps> = ({ document, onClose, onConfirm }) => (
    <ConfirmationModal
        title="Dokument löschen"
        message={`Möchten Sie das Dokument "${document.file_name || document.name}" wirklich löschen?`}
        onConfirm={onConfirm}
        onCancel={onClose}
        confirmText="Löschen"
        isDestructive={true}
    />
);

export default DeleteDocumentModal;
