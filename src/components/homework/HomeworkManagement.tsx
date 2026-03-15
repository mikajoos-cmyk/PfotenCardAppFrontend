import React, { FC, useState, useRef } from 'react';
import { useHomework } from '../../hooks/queries/useHomework';
import Icon from '../ui/Icon';
import LoadingSpinner from '../ui/LoadingSpinner';

interface HomeworkManagementProps {
    token: string | null;
}

const HomeworkManagement: FC<HomeworkManagementProps> = ({ token }) => {
    const { templates, createTemplate, updateTemplate, deleteTemplate, uploadFiles } = useHomework(token);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        video_url: '',
        file_url: '',
        file_name: ''
    });

    const resetForm = () => {
        setFormData({ title: '', description: '', video_url: '', file_url: '', file_name: '' });
        setEditingTemplate(null);
    };

    const handleOpenModal = (template?: any) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                title: template.title,
                description: template.description || '',
                video_url: template.video_url || '',
                file_url: template.file_url || '',
                file_name: template.file_name || ''
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            // Das Backend erwartet ein Array von Files bei uploadFiles
            const result = await uploadFiles.mutateAsync([file]);
            // Wir nehmen die erste Datei aus der Antwort (sofern so vom Backend zurückgegeben)
            if (result && result.all_files && result.all_files.length > 0) {
                const uploadedFile = result.all_files[0];
                setFormData(prev => ({ ...prev, file_url: uploadedFile.file_url, file_name: uploadedFile.file_name }));
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload fehlgeschlagen");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTemplate) {
                await updateTemplate.mutateAsync({ id: editingTemplate.id, data: formData });
            } else {
                await createTemplate.mutateAsync(formData);
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Submit failed", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Möchtest du diese Vorlage wirklich endgültig löschen?")) {
            try {
                await deleteTemplate.mutateAsync(id);
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    if (templates.isLoading) return <LoadingSpinner message="Lade Katalog..." />;

    return (
        <div className="homework-management" style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>Trainingskatalog</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Verwalte Vorlagen für Hausaufgaben und Übungen.</p>
                </div>
                <button className="button button-primary" onClick={() => handleOpenModal()}>
                    <Icon name="plus" /> Neue Vorlage
                </button>
            </div>

            {templates.data?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-background)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
                    <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem auto', backgroundColor: 'var(--bg-accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
                        <Icon name="book-open" style={{ width: '32px', height: '32px' }} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Noch keine Vorlagen</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Erstelle deine erste Übungsvorlage für den Katalog.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {templates.data?.map((t: any) => (
                        <div key={t.id} className="content-box" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600, paddingRight: '1rem' }}>{t.title}</h4>
                                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                    <button className="action-icon-btn" onClick={() => handleOpenModal(t)} title="Bearbeiten">
                                        <Icon name="edit" />
                                    </button>
                                    <button className="action-icon-btn delete" onClick={() => handleDelete(t.id)} title="Löschen">
                                        <Icon name="trash" />
                                    </button>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                                {t.description || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Keine Beschreibung</span>}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                {t.video_url && (
                                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--bg-accent-red)', color: 'var(--brand-red)', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Icon name="video" size={12} /> Video
                                    </span>
                                )}
                                {t.file_url && (
                                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--bg-accent-green)', color: 'var(--brand-green)', fontWeight: 600, border: '1px solid rgba(34, 197, 94, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Icon name="file" size={12} /> Datei
                                    </span>
                                )}
                                {!t.video_url && !t.file_url && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Nur Text</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header blue">
                            <h2>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</h2>
                            <button className="close-button" onClick={() => setIsModalOpen(false)}>
                                <Icon name="x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit} id="homework-template-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Titel der Übung *</label>
                                    <input
                                        className="form-input"
                                        placeholder="z.B. Leinenführigkeit Stufe 1"
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Beschreibung / Anleitung</label>
                                    <textarea
                                        className="form-input"
                                        rows={5}
                                        placeholder="Schreibe hier die Schritt-für-Schritt Anleitung auf..."
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>YouTube / Vimeo Video-Link</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}>
                                            <Icon name="video" size={18} />
                                        </div>
                                        <input
                                            className="form-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={formData.video_url}
                                            onChange={e => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Zusätzliche Datei (PDF, Bild etc.)</label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleFileUpload}
                                    />

                                    <div
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        style={{
                                            border: '2px dashed var(--border-color)',
                                            padding: '1.5rem',
                                            textAlign: 'center',
                                            borderRadius: '0.75rem',
                                            backgroundColor: formData.file_url ? 'var(--bg-accent-green)' : 'var(--background-secondary)',
                                            cursor: isUploading ? 'wait' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            borderColor: formData.file_url ? 'var(--brand-green)' : 'var(--border-color)'
                                        }}
                                        onMouseOver={(e) => { if(!formData.file_url && !isUploading) e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
                                        onMouseOut={(e) => { if(!formData.file_url && !isUploading) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                    >
                                        {isUploading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                                <Icon name="refresh" className="animate-spin" size={24} />
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Lädt hoch...</span>
                                            </div>
                                        ) : formData.file_url ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--brand-green)', overflow: 'hidden' }}>
                                                    <Icon name="file" size={24} style={{ flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formData.file_name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="button-icon-only"
                                                    style={{ color: 'var(--brand-red)' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFormData(prev => ({ ...prev, file_url: '', file_name: '' }));
                                                    }}
                                                    title="Datei entfernen"
                                                >
                                                    <Icon name="trash" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--card-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                                    <Icon name="upload" size={20} />
                                                </div>
                                                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Datei auswählen</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Klicken, um eine Datei hochzuladen</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="button button-outline" onClick={() => setIsHomeworkModalOpen(false)}>Abbrechen</button>
                            <button type="submit" form="homework-template-form" className="button button-primary" disabled={createTemplate.isPending || updateTemplate.isPending || isUploading}>
                                {createTemplate.isPending || updateTemplate.isPending ? 'Speichert...' : 'Vorlage speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeworkManagement;