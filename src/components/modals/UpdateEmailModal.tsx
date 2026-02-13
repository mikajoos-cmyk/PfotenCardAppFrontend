import React, { FC, useState } from 'react';
import InfoModal from './InfoModal';
import { supabase } from '../../lib/supabase';
import Icon from '../ui/Icon';

interface UpdateEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentEmail: string;
    onSuccess: (newEmail: string) => void;
}

const UpdateEmailModal: FC<UpdateEmailModalProps> = ({ isOpen, onClose, currentEmail, onSuccess }) => {
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newEmail) {
            setError('Bitte gib eine neue E-Mail-Adresse ein.');
            return;
        }

        if (newEmail === currentEmail) {
            setError('Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden.');
            return;
        }

        if (newEmail !== confirmEmail) {
            setError('Die E-Mail-Adressen stimmen nicht überein.');
            return;
        }

        setIsLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });

            if (updateError) {
                throw updateError;
            }

            setIsSuccess(true);
            onSuccess(newEmail);
        } catch (err: any) {
            console.error('Error updating email:', err);
            setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <InfoModal title="E-Mail ändern" onClose={onClose} color="green">
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: 'var(--brand-green-light)', 
                        color: 'var(--brand-green)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto 1rem' 
                    }}>
                        <Icon name="check" width={32} height={32} />
                    </div>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Bestätigung erforderlich!</p>
                    <p>Wir haben eine Bestätigungs-E-Mail an <strong>{newEmail}</strong> gesendet.</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.4rem' }}>
                        <strong>Wichtig:</strong> Abhängig von den Sicherheitseinstellungen musst du eventuell den Link in <strong>zwei</strong> E-Mails bestätigen (an deine alte und deine neue Adresse), damit die Änderung aktiv wird.
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        Bitte klicke auf den Link in der E-Mail, um die Änderung abzuschließen. 
                        Bis dahin bleibt deine alte E-Mail-Adresse aktiv.
                    </p>
                    <button 
                        className="button button-primary" 
                        onClick={onClose}
                        style={{ marginTop: '1.5rem', width: '100%' }}
                    >
                        Verstanden
                    </button>
                </div>
            </InfoModal>
        );
    }

    return (
        <InfoModal title="E-Mail Adresse ändern" onClose={onClose}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Gib deine neue E-Mail-Adresse ein. Du erhältst anschließend eine Bestätigungs-E-Mail an die neue Adresse.
                </p>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Aktuelle E-Mail</label>
                    <input 
                        type="text" 
                        value={currentEmail} 
                        disabled 
                        style={{ 
                            width: '100%', 
                            padding: '0.6rem', 
                            borderRadius: '0.4rem', 
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            cursor: 'not-allowed'
                        }} 
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Neue E-Mail-Adresse</label>
                    <input 
                        type="email" 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        placeholder="beispiel@mail.de"
                        required
                        style={{ 
                            width: '100%', 
                            padding: '0.6rem', 
                            borderRadius: '0.4rem', 
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)'
                        }} 
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>E-Mail-Adresse bestätigen</label>
                    <input 
                        type="email" 
                        value={confirmEmail} 
                        onChange={(e) => setConfirmEmail(e.target.value)} 
                        placeholder="beispiel@mail.de"
                        required
                        style={{ 
                            width: '100%', 
                            padding: '0.6rem', 
                            borderRadius: '0.4rem', 
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)'
                        }} 
                    />
                </div>

                {error && (
                    <div style={{ color: 'var(--brand-red)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button 
                        type="button" 
                        className="button button-outline" 
                        onClick={onClose}
                        disabled={isLoading}
                        style={{ flex: 1 }}
                    >
                        Abbrechen
                    </button>
                    <button 
                        type="submit" 
                        className="button button-primary" 
                        disabled={isLoading}
                        style={{ flex: 1 }}
                    >
                        {isLoading ? 'Wird gespeichert...' : 'Änderung anfordern'}
                    </button>
                </div>
            </form>
        </InfoModal>
    );
};

export default UpdateEmailModal;
