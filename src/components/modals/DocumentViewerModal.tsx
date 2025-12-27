import React, { FC } from 'react';
import { DocumentFile } from '../../types';
import Icon from '../ui/Icon';

interface DocumentViewerModalProps {
    document: DocumentFile;
    onClose: () => void;
}

const DocumentViewerModal: FC<DocumentViewerModalProps> = ({ document, onClose }) => {
    // Dateityp prüfen
    const isImage = document.type.startsWith('image/');
    const isPDF = document.type === 'application/pdf';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                {/* Header */}
                <div className="modal-header blue">
                    <h2>{document.name}</h2>
                    <button className="close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>

                {/* Body (Vorschau) */}
                <div className="modal-body" style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: '2rem' }}>
                    {isImage && (
                        <img
                            src={document.url}
                            alt={document.name}
                            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                    )}
                    {isPDF && (
                        <embed
                            src={document.url}
                            type="application/pdf"
                            width="100%"
                            height="600px"
                            style={{ borderRadius: '4px' }}
                        />
                    )}
                    {!isImage && !isPDF && (
                        <div style={{ textAlign: 'center', color: '#64748B' }}>
                            <Icon name="file" style={{ width: '64px', height: '64px', marginBottom: '1rem', color: '#94A3B8' }} />
                            <p style={{ fontSize: '1.1rem' }}>Keine Vorschau für diesen Dateityp verfügbar.</p>
                        </div>
                    )}
                </div>

                {/* Footer mit Buttons nebeneinander */}
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>
                        Schließen
                    </button>
                    <a
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-primary"
                        download={document.name} // Browser-Hinweis zum Download
                    >
                        <Icon name="download" /> Herunterladen
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DocumentViewerModal;