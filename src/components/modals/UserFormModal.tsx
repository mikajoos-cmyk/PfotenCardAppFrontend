import React, { FC, useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import Icon from '../ui/Icon';
import { PasswordInput } from '../ui/PasswordInput';
import { BaseModal } from '../ui/BaseModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

interface UserFormModalProps {
    user: User | null;
    onClose: () => void;
    onSave: (data: any) => void;
}

const UserFormModal: FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState<UserRole>(user?.role || 'mitarbeiter');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
            setPassword('');
        } else {
            setName('');
            setEmail('');
            setRole('mitarbeiter');
            setPassword('');
        }
    }, [user]);

    const handleSubmit = async () => {
        if (!name || !email) {
            alert("Name und E-Mail sind Pflichtfelder.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data: any = { name, email, role };
            if (password) {
                data.password = password;
            }
            await onSave(data);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={true}
            onClose={(open) => !open && onClose()}
            title={user ? 'Benutzer bearbeiten' : 'Mitarbeiter einladen'}
            footer={
                <div className="flex justify-end gap-2 w-full">
                    <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                    <Button onClick={handleSubmit} isLoading={isSubmitting}>
                        {user ? 'Speichern' : 'Einladung senden'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="userName">Name</Label>
                    <Input
                        id="userName"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Max Mustermann"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="userEmail">E-Mail</Label>
                    <Input
                        id="userEmail"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="mitarbeiter@hundeschule.de"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="userRole">Rolle</Label>
                    <Select value={role} onValueChange={(val: UserRole) => setRole(val)}>
                        <SelectTrigger id="userRole">
                            <SelectValue placeholder="Rolle wählen" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mitarbeiter">Mitarbeiter (Eingeschränkt)</SelectItem>
                            <SelectItem value="admin">Administrator (Vollzugriff)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {user ? (
                    <div className="mt-4 pt-4 border-t">
                        <PasswordInput
                            label="Passwort ändern (leer lassen zum Beibehalten)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Neues Passwort"
                        />
                    </div>
                ) : (
                    <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm border border-blue-100 flex gap-3 items-start mt-4">
                        <Icon name="mail" width={20} height={20} className="shrink-0 mt-0.5" />
                        <div>
                            <strong>Einladung per E-Mail</strong>
                            <p className="mt-1 opacity-90">Der Benutzer erhält einen Link, um seine E-Mail zu bestätigen und ein eigenes Passwort festzulegen.</p>
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default UserFormModal;