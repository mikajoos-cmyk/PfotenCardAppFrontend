import React, { FC } from 'react';
import { DocumentFile } from '../../types';
import Icon from '../ui/Icon';

interface DocumentViewerModalProps {
    document: DocumentFile;
    onClose: () => void;
}

const DocumentViewerModal: FC<DocumentViewerModalProps> = ({ document, onClose }) => {
    const isImage = document.type.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(document.name);
    const isPDF = document.type === 'application/pdf' || 
                  document.name.toLowerCase().endsWith('.pdf');
    const isVideo = document.type.startsWith('video/') || 
                    /\.(mp4|webm|ogg|mov)$/i.test(document.name);

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
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', width: isPDF ? '85vw' : '800px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

                {/* Header */}
                <div className="modal-header blue" style={{ flexShrink: 0, borderRadius: 0 }}>
                    <h2 style={{ fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{document.name}</h2>
                    <button className="close-button" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>

                {/* Body: Vorschau */}
                <div className="modal-body" style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: isPDF ? '#f0f2f5' : 'var(--background-color)', padding: isPDF ? 0 : '1rem', minHeight: '400px' }}>
                    {isImage && (
                        <img
                            src={document.url}
                            alt={document.name}
                            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                    )}
                    {isPDF && (
                        <iframe
                            src={`${document.url}#toolbar=0`}
                            title={document.name}
                            width="100%"
                            height="100%"
                            style={{ border: 'none', height: '75vh', minHeight: '500px' }}
                        />
                    )}
                    {isVideo && (
                        <video 
                            src={document.url} 
                            controls 
                            style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '4px' }}
                        >
                            Ihr Browser unterstützt das Video-Tag nicht.
                        </video>
                    )}
                    {!isImage && !isPDF && !isVideo && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                            <Icon name="file" style={{ width: '80px', height: '80px', margin: '0 auto 1.5rem', opacity: 0.3, color: 'var(--primary-color)' }} />
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Keine Vorschau verfügbar</h3>
                            <p style={{ fontSize: '0.9rem' }}>Diese Datei kann nicht direkt im Browser angezeigt werden.</p>
                        </div>
                    )}
                </div>

                {/* Footer: Buttons nebeneinander */}
                <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-background)', padding: '1rem' }}>
                    <button className="button button-outline" onClick={onClose} style={{ marginRight: 'auto' }}>
                        Schließen
                    </button>
                    <button className="button button-primary" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="download" /> Herunterladen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentViewerModal;