import React, { FC, useState } from 'react';
import Icon from '../ui/Icon';

interface AddCustomerModalProps {
    onClose: () => void;
    onAddCustomer: (data: any) => void;
}

const AddCustomerModal: FC<AddCustomerModalProps> = ({ onClose, onAddCustomer }) => {
    const [page, setPage] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dogName, setDogName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [chip, setChip] = useState('');
    const [dogBreed, setDogBreed] = useState('');
    const [dogBirthDate, setDogBirthDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!firstName || !lastName || !dogName) {
            alert("Bitte alle Pflichtfelder (Vorname, Nachname, Hundename) ausfüllen.");
            return;
        }
        setIsSubmitting(true);
        try {
            await onAddCustomer({ firstName, lastName, dogName, email, phone, chip, dogBreed, dogBirthDate });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                <div className="modal-header green">
                    <h2>Neuen Kunden anlegen</h2>
                    <button className="close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Stepper Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                            backgroundColor: page >= 1 ? 'var(--brand-green)' : 'var(--background-secondary)',
                            color: page >= 1 ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.3s ease'
                        }}>
                            1
                        </div>
                        <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--background-secondary)', margin: '0 0.5rem', position: 'relative', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: 'var(--brand-green)',
                                transition: 'width 0.3s ease', width: page >= 2 ? '100%' : '0%'
                            }}></div>
                        </div>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                            backgroundColor: page >= 2 ? 'var(--brand-green)' : 'var(--background-secondary)',
                            color: page >= 2 ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.3s ease'
                        }}>
                            2
                        </div>
                    </div>

                    <form id="add-customer-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {page === 1 ? (
                            <div style={{ animation: 'slideIn 0.2s ease-out' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>1. Persönliche Daten</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Vorname *</label>
                                        <input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Nachname *</label>
                                        <input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                    <label>E-Mail-Adresse</label>
                                    <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="kunde@beispiel.de" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Telefonnummer</label>
                                    <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ animation: 'slideIn 0.2s ease-out' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>2. Hunde-Daten</h3>
                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                    <label>Name des Hundes *</label>
                                    <input type="text" className="form-input" value={dogName} onChange={e => setDogName(e.target.value)} required autoFocus />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                    <label>Rasse (Optional)</label>
                                    <input type="text" className="form-input" value={dogBreed} onChange={e => setDogBreed(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                    <label>Geburtsdatum (Optional)</label>
                                    <input type="date" className="form-input" value={dogBirthDate} onChange={e => setDogBirthDate(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Chipnummer (Optional)</label>
                                    <input type="text" className="form-input" value={chip} onChange={e => setChip(e.target.value)} />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    {page === 1 ? (
                        <button type="button" className="button button-outline" onClick={onClose}>
                            Abbrechen
                        </button>
                    ) : (
                        <button type="button" className="button button-outline" onClick={() => setPage(1)}>
                            Zurück
                        </button>
                    )}

                    {page === 1 ? (
                        <button type="button" className="button button-primary" onClick={() => {
                            if(!firstName || !lastName) {
                                alert("Bitte Vor- und Nachnamen ausfüllen.");
                                return;
                            }
                            setPage(2);
                        }}>
                            Weiter zu Hunde-Daten
                        </button>
                    ) : (
                        <button type="submit" form="add-customer-form" className="button button-primary" disabled={isSubmitting || !dogName}>
                            {isSubmitting ? 'Wird angelegt...' : 'Kunde anlegen'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddCustomerModal;