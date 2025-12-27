import React, { FC } from 'react';
import { DocumentFile } from '../../types';
import InfoModal from './InfoModal';
import Icon from '../ui/Icon'; // Icon importieren

interface DocumentViewerModalProps {
    document: DocumentFile;
    onClose: () => void;
}

const DocumentViewerModal: FC<DocumentViewerModalProps> = ({ document, onClose }) => {
    // Determine content based on file type
    const isImage = document.type.startsWith('image/');
    const isPDF = document.type === 'application/pdf';

    return (
        <InfoModal title={document.name} onClose={onClose} color="blue">
            {/* flexDirection: 'column' hinzugefügt, damit Button unter dem Bild ist */}
            <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                {isImage && <img src={document.url} alt={document.name} style={{ maxWidth: '100%', maxHeight: '600px' }} />}

                {isPDF && <embed src={document.url} type="application/pdf" width="100%" height="600px" />}

                {!isImage && !isPDF && (
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <p>Vorschau nicht verfügbar.</p>
                    </div>
                )}

                {/* Download Button - Jetzt immer sichtbar */}
                <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-primary"
                    style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    download={document.name} // Wichtig für den Download-Trigger
                >
                    <Icon name="download" /> Herunterladen
                </a>
            </div>
        </InfoModal>
    );
};

export default DocumentViewerModal;