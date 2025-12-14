
import React, { FC } from 'react';
import { DocumentFile } from '../../types';
import InfoModal from './InfoModal';

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
            <div style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {isImage && <img src={document.url} alt={document.name} style={{ maxWidth: '100%', maxHeight: '600px' }} />}
                {isPDF && <embed src={document.url} type="application/pdf" width="100%" height="600px" />}
                {!isImage && !isPDF && (
                    <div style={{ textAlign: 'center' }}>
                        <p>Vorschau nicht verfügbar.</p>
                        <a href={document.url} target="_blank" rel="noreferrer" className="button button-primary" style={{ marginTop: '1rem' }}>
                            Herunterladen
                        </a>
                    </div>
                )}
            </div>
        </InfoModal>
    );
};

export default DocumentViewerModal;
