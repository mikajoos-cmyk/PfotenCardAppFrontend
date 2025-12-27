import React, { FC } from 'react';
import { DocumentFile } from '../../types';
import Icon from '../ui/Icon';

interface DocumentViewerModalProps {
    document: DocumentFile;
    onClose: () => void;
}

const DocumentViewerModal: FC<DocumentViewerModalProps> = ({ document, onClose }) => {
    const isImage = document.type.startsWith('image/');
    const isPDF = document.type === 'application/pdf';

    // Diese Funktion erzwingt den Download
    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            // 1. Datei als "Blob" (Binärdaten) laden
            const response = await fetch(document.url);
            const blob = await response.blob();

            // 2. Temporäre URL für diesen Blob erstellen
            const url = window.URL.createObjectURL(blob);

            // 3. Unsichtbaren Link erstellen und klicken
            const link = window.document.createElement('a');
            link.href = url;
            link.download = document.name; // Erzwingt den Dateinamen
            window.document.body.appendChild(link);
            link.click();

            // 4. Aufräumen
            window.document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download fehlgeschlagen, öffne Fallback...", error);
            // Fallback: Falls Fetch fehlschlägt, im neuen Tab öffnen
            window.open(document.url, '_blank');
        }
    };

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

                {/* Body: Vorschau */}
                {/* KORREKTUR: backgroundColor entfernt, damit var(--card-background) greift */}
                <div className="modal-body" style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    {isImage && (
                        <img
                            src={document.url}
                            alt={document.name}
                            style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '4px' }}
                        />
                    )}
                    {isPDF && (
                        <embed
                            src={document.url}
                            type="application/pdf"
                            width="100%"
                            height="500px"
                            style={{ borderRadius: '4px' }}
                        />
                    )}
                    {!isImage && !isPDF && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Icon name="file" style={{ width: '64px', height: '64px', margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>Keine Vorschau verfügbar</p>
                        </div>
                    )}
                </div>

                {/* Footer: Buttons nebeneinander */}
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>
                        Schließen
                    </button>
                    <button className="button button-primary" onClick={handleDownload}>
                        <Icon name="download" /> Herunterladen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentViewerModal;