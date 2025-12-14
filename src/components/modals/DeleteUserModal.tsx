
import React, { FC } from 'react';
import { User } from '../../types';
import ConfirmationModal from './ConfirmationModal';

interface DeleteUserModalProps {
    user: User;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteUserModal: FC<DeleteUserModalProps> = ({ user, onClose, onConfirm }) => (
    <ConfirmationModal
        title="Benutzer löschen"
        message={`Möchten Sie den Benutzer "${user.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={onConfirm}
        onCancel={onClose}
        confirmText="Löschen"
        isDestructive={true}
    />
);

export default DeleteUserModal;
