import React, { FC, useState } from 'react';
import { useHomework } from '../../hooks/queries/useHomework';
import Icon from '../ui/Icon';
import LoadingSpinner from '../ui/LoadingSpinner';

interface HomeworkManagementProps {
    token: string | null;
}

const HomeworkManagement: FC<HomeworkManagementProps> = ({ token }) => {
    const { templates, createTemplate, updateTemplate, deleteTemplate, uploadFile } = useHomework(token);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
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
            const result = await uploadFile.mutateAsync(file);
            setFormData(prev => ({ ...prev, file_url: result.file_url, file_name: result.file_name }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload fehlgeschlagen");
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
        if (window.confirm("Dieses Template wirklich löschen?")) {
            try {
                await deleteTemplate.mutateAsync(id);
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    if (templates.isLoading) return <LoadingSpinner />;

    return (
        <div className="homework-management">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Trainingskatalog / Hausaufgaben</h3>
                <button className="button-primary" onClick={() => handleOpenModal()}>
                    <Icon name="plus" /> Neue Vorlage
                </button>
            </div>

            <div className="grid-container">
                {templates.data?.map((t: any) => (
                    <div key={t.id} className="card p-4">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: 0 }}>{t.title}</h4>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="button-icon-only" onClick={() => handleOpenModal(t)}>
                                    <Icon name="edit" />
                                </button>
                                <button className="button-icon-only" onClick={() => handleDelete(t.id)} style={{ color: 'var(--brand-red)' }}>
                                    <Icon name="trash" />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{t.description}</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            {t.video_url && <span className="badge badge-blue"><Icon name="play" size={14} /> Video</span>}
                            {t.file_url && <span className="badge badge-green"><Icon name="file" size={14} /> PDF/PPT</span>}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <Icon name="x" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4">
                            <div className="form-group mb-4">
                                <label className="form-label">Titel</label>
                                <input 
                                    className="form-input" 
                                    value={formData.title} 
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} 
                                    required 
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Beschreibung / Anleitung</label>
                                <textarea 
                                    className="form-input" 
                                    rows={4}
                                    value={formData.description} 
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">YouTube Video Link</label>
                                <input 
                                    className="form-input" 
                                    placeholder="https://youtube.com/..."
                                    value={formData.video_url} 
                                    onChange={e => setFormData(prev => ({ ...prev, video_url: e.target.value }))} 
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Datei (PDF, PPT, Bild)</label>
                                <div className="file-upload-zone" style={{ border: '2px dashed var(--border-color)', padding: '1rem', textAlign: 'center', borderRadius: '8px' }}>
                                    {formData.file_url ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <Icon name="file" />
                                            <span>{formData.file_name}</span>
                                            <button type="button" className="button-as-link text-red-500" onClick={() => setFormData(prev => ({ ...prev, file_url: '', file_name: '' }))}>Entfernen</button>
                                        </div>
                                    ) : (
                                        <input type="file" onChange={handleFileUpload} disabled={uploadFile.isPending} />
                                    )}
                                    {uploadFile.isPending && <p>Lade hoch...</p>}
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: 0, marginTop: '2rem' }}>
                                <button type="button" className="button-secondary" onClick={() => setIsModalOpen(false)}>Abbrechen</button>
                                <button type="submit" className="button-primary" disabled={createTemplate.isPending || updateTemplate.isPending}>
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeworkManagement;
