
import React, { FC, useState, useEffect } from 'react';
import Icon from '../ui/Icon';

interface DogFormModalProps {
    dog: any | null; // null = Neuer Hund
    onClose: () => void;
    onSave: (dogData: any) => void;
}

const DogFormModal: FC<DogFormModalProps> = ({ dog, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [breed, setBreed] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [chip, setChip] = useState('');

    useEffect(() => {
        if (dog) {
            setName(dog.name || '');
            setBreed(dog.breed || '');
            setBirthDate(dog.birth_date ? dog.birth_date.substring(0, 10) : '');
            setChip(dog.chip || '');
        } else {
            // Reset fields for new dog
            setName('');
            setBreed('');
            setBirthDate('');
            setChip('');
        }
    }, [dog]);

    const handleSave = () => {
        if (!name) return alert("Bitte Hundename angeben");
        onSave({ id: dog?.id, name, breed, birth_date: birthDate, chip });
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header blue">
                    <h2>{dog ? 'Hund bearbeiten' : 'Neuen Hund hinzufügen'}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group"><label>Name *</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>Rasse</label><input type="text" className="form-input" value={breed} onChange={e => setBreed(e.target.value)} /></div>
                    <div className="form-group"><label>Geburtsdatum</label><input type="date" className="form-input" value={birthDate} onChange={e => setBirthDate(e.target.value)} /></div>
                    <div className="form-group"><label>Chipnummer</label><input type="text" className="form-input" value={chip} onChange={e => setChip(e.target.value)} /></div>
                </div>
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>Abbrechen</button>
                    <button className="button button-primary" onClick={handleSave}>Speichern</button>
                </div>
            </div>
        </div>
    );
};

export default DogFormModal;
