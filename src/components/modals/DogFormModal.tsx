
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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (dog) {
            setName(dog.name || '');
            setBreed(dog.breed || '');
            setBirthDate(dog.birth_date ? dog.birth_date.substring(0, 10) : '');
            setChip(dog.chip || '');
            setImagePreview(dog.image_url ? dog.image_url : null);
        } else {
            // Reset fields for new dog
            setName('');
            setBreed('');
            setBirthDate('');
            setChip('');
            setImageFile(null);
            setImagePreview(null);
        }
    }, [dog]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!name) return alert("Bitte Hundename angeben");
        onSave({ id: dog?.id, name, breed, birth_date: birthDate, chip, imageFile });
        onClose();
    };

    // Helper to get full URL for preview
    const getPreviewUrl = (url: string) => {
        if (url.startsWith('data:')) return url;
        if (url.startsWith('http')) return url;
        const supabaseUrl = (window as any).importMetaEnv?.VITE_SUPABASE_URL || 'https://vubpzwunvshfthosrhmr.supabase.co'; // Fallback for preview
        return `${supabaseUrl}/storage/v1/object/public/public_uploads/${url}`;
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header blue">
                    <h2>{dog ? 'Hund bearbeiten' : 'Neuen Hund hinzufügen'}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                        <div 
                            style={{ 
                                width: '100px', 
                                height: '100px', 
                                borderRadius: '1rem', 
                                backgroundColor: 'var(--background-color)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                overflow: 'hidden',
                                border: '2px dashed var(--border-color)',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                            onClick={() => document.getElementById('dog-image-upload')?.click()}
                        >
                            {imagePreview ? (
                                <img src={getPreviewUrl(imagePreview)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Icon name="camera" width={32} height={32} />
                            )}
                            <input 
                                type="file" 
                                id="dog-image-upload" 
                                hidden 
                                accept="image/*" 
                                onChange={handleImageChange} 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label>Bild auswählen</label>
                                <button 
                                    className="button button-outline" 
                                    style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                                    onClick={() => document.getElementById('dog-image-upload')?.click()}
                                >
                                    {imageFile ? 'Bild ändern' : 'Bild hochladen'}
                                </button>
                            </div>
                        </div>
                    </div>

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
