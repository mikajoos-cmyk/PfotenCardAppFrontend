
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

    const handleSubmit = () => {
        if (!firstName || !lastName || !dogName) {
            alert("Bitte alle Pflichtfelder (Vorname, Nachname, Hundename) ausfüllen.");
            return;
        }
        onAddCustomer({ firstName, lastName, dogName, email, phone, chip, dogBreed, dogBirthDate });
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header green">
                    <h2>Neuen Kunden anlegen</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <div className="progress-bar-container">
                        <div className={`progress-step ${page >= 1 ? 'active' : ''}`}>1</div>
                        <div className="progress-line"></div>
                        <div className={`progress-step ${page >= 2 ? 'active' : ''}`}>2</div>
                    </div>

                    {page === 1 ? (
                        <>
                            <div className="form-group row">
                                <div><label>Vorname *</label><input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                                <div><label>Nachname *</label><input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                            </div>
                            <div className="form-group"><label>E-Mail</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} /></div>
                            <div className="form-group"><label>Telefon</label><input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                        </>
                    ) : (
                        <>
                            <div className="form-group"><label>Name des Hundes *</label><input type="text" className="form-input" value={dogName} onChange={e => setDogName(e.target.value)} /></div>
                            <div className="form-group"><label>Rasse</label><input type="text" className="form-input" value={dogBreed} onChange={e => setDogBreed(e.target.value)} /></div>
                            <div className="form-group"><label>Geburtsdatum</label><input type="date" className="form-input" value={dogBirthDate} onChange={e => setDogBirthDate(e.target.value)} /></div>
                            <div className="form-group"><label>Chipnummer</label><input type="text" className="form-input" value={chip} onChange={e => setChip(e.target.value)} /></div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    {page === 1 ? (
                        <button className="button button-outline" onClick={onClose}>Abbrechen</button>
                    ) : (
                        <button className="button button-outline" onClick={() => setPage(1)}>Zurück</button>
                    )}
                    {page === 1 ? (
                        <button className="button button-primary" onClick={() => setPage(2)}>Weiter</button>
                    ) : (
                        <button className="button button-primary" onClick={handleSubmit}>Kunden anlegen</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddCustomerModal;
