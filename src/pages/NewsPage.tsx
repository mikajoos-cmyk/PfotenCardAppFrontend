import React, { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { NewsPost, User } from '../types';
import { hasPermission } from '../lib/permissions';
import { MOCK_NEWS } from '../lib/mockData';
import Icon from '../components/ui/Icon';
import { useNews } from '../hooks/queries/useNews';
import { useConfig } from '../hooks/queries/useConfig';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface NewsPageProps {
    user: User | any;
    token: string | null;
    targetAppointmentId?: number;
    isPreviewMode?: boolean;
}

export const NewsPage: React.FC<NewsPageProps> = ({ user, token, targetAppointmentId, isPreviewMode }) => {
    const queryClient = useQueryClient();

    const { data: newsData, isLoading: newsLoading } = useNews(token, { refetchInterval: 30000 });
    const { data: configData } = useConfig();

    const posts = isPreviewMode ? MOCK_NEWS : (newsData || []);
    const availableLevels = configData?.levels || [];
    const availableAppointments = configData?.appointments || [];
    const loading = newsLoading && !isPreviewMode;

    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingPost, setEditingPost] = useState<NewsPost | null>(null);

    const [audienceType, setAudienceType] = useState<'all' | 'specific_levels' | 'specific_appointments'>('all');
    const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
    const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<number[]>([]);
    const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'past'>('upcoming');

    const [isMainTypeDropdownOpen, setIsMainTypeDropdownOpen] = useState(false);
    const [isSpecificDropdownOpen, setIsSpecificDropdownOpen] = useState(false);

    const filteredAppointments = availableAppointments
        .filter((app: any) => {
            const isPast = new Date(app.start_time) < new Date();
            return appointmentFilter === 'past' ? isPast : !isPast;
        })
        .sort((a: any, b: any) => {
            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();
            return appointmentFilter === 'upcoming' ? timeA - timeB : timeB - timeA;
        });

    useEffect(() => {
        if (targetAppointmentId) {
            setAudienceType('specific_appointments');
            setSelectedAppointmentIds([targetAppointmentId]);
            setIsCreating(true);
        }
    }, [targetAppointmentId]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `news_images/${Date.now()}_${fileName}`;

        setIsUploading(true);
        try {
            const { error: uploadError } = await supabase.storage.from('notifications').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('notifications').getPublicUrl(filePath);
            setUploadedImageUrl(publicUrl);
        } catch (error: any) {
            alert('Upload fehlgeschlagen: ' + (error.message || error));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const postData = {
                title: newTitle,
                content: newContent,
                image_url: uploadedImageUrl || undefined,
                target_level_ids: audienceType === 'specific_levels' ? selectedLevelIds : [],
                target_appointment_ids: audienceType === 'specific_appointments' ? selectedAppointmentIds : []
            };

            if (editingPost) {
                await apiClient.updateNews(editingPost.id, postData, token);
            } else {
                await apiClient.createNews(postData, token);
            }
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['news'] });
        } catch (error) {
            alert(editingPost ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewTitle(''); setNewContent(''); setUploadedImageUrl('');
        setAudienceType('all'); setSelectedLevelIds([]); setSelectedAppointmentIds([]);
        setIsCreating(false); setEditingPost(null);
    };

    const handleEditClick = (post: NewsPost) => {
        setEditingPost(post);
        setNewTitle(post.title);
        setNewContent(post.content);
        setUploadedImageUrl(post.image_url || '');

        if (post.target_level_ids && post.target_level_ids.length > 0) {
            setAudienceType('specific_levels');
            setSelectedLevelIds(post.target_level_ids);
        } else if (post.target_appointment_ids && post.target_appointment_ids.length > 0) {
            setAudienceType('specific_appointments');
            setSelectedAppointmentIds(post.target_appointment_ids);
        } else {
            setAudienceType('all');
        }
        setIsCreating(true);
    };

    const handleDeletePost = async (postId: number) => {
        if (!window.confirm('Diesen Beitrag wirklich löschen?')) return;
        try {
            await apiClient.deleteNews(postId, token);
            queryClient.invalidateQueries({ queryKey: ['news'] });
        } catch (error) {
            alert('Fehler beim Löschen');
        }
    };

    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';

    if (loading) return <div style={{ height: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><LoadingSpinner message="Lade Neuigkeiten..." /></div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Neuigkeiten</h1>
                    <p>Aktuelle Informationen und Updates</p>
                </div>
                {isAdminOrStaff && hasPermission(user, 'can_create_messages') && (
                    <button onClick={() => setIsCreating(true)} className="button button-primary">
                        <Icon name="plus" /> Beitrag erstellen
                    </button>
                )}
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-background)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
                        <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem auto', backgroundColor: 'var(--bg-accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
                            <Icon name="news" style={{ width: '32px', height: '32px' }} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Keine Neuigkeiten</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Es wurden noch keine Beiträge veröffentlicht.</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <article key={post.id} className="content-box" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            {post.image_url && (
                                <div style={{ width: '100%', backgroundColor: 'var(--background-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
                                    <img src={post.image_url} alt={post.title} style={{ maxHeight: '400px', width: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{post.title}</h2>
                                    {isAdminOrStaff && hasPermission(user, 'can_create_messages') && (
                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                            <button className="action-icon-btn" onClick={() => handleEditClick(post)} title="Bearbeiten"><Icon name="edit" /></button>
                                            <button className="action-icon-btn delete" onClick={() => handleDeletePost(post.id)} title="Löschen"><Icon name="trash" /></button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Icon name="calendar" size={14} /> {new Date(post.created_at).toLocaleDateString('de-DE')}</span>
                                    {post.author_name && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Icon name="user" size={14} /> {post.author_name}</span>
                                    )}
                                </div>

                                <div style={{ lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
                                    {post.content}
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>

            {/* Modal für neuen Beitrag */}
            {isCreating && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header blue">
                            <h2>{editingPost ? 'Beitrag bearbeiten' : 'Neuen Beitrag erstellen'}</h2>
                            <button className="close-button" onClick={resetForm}><Icon name="x" /></button>
                        </div>
                        <div className="modal-body">
                            <form id="news-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Titel</label>
                                    <input type="text" required className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Wichtige Neuigkeiten..." />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Inhalt</label>
                                    <textarea required rows={6} className="form-input" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Schreibe hier deinen Text..." />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Titelbild (Optional)</label>
                                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                                    <div
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        style={{
                                            border: '2px dashed var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center',
                                            cursor: isUploading ? 'wait' : 'pointer', backgroundColor: uploadedImageUrl ? 'var(--background-secondary)' : 'transparent',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onMouseOver={e => { if(!isUploading) e.currentTarget.style.borderColor = 'var(--primary-color)'}}
                                        onMouseOut={e => { if(!isUploading) e.currentTarget.style.borderColor = 'var(--border-color)'}}
                                    >
                                        {isUploading ? (
                                            <LoadingSpinner message="Lädt hoch..." />
                                        ) : uploadedImageUrl ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <img src={uploadedImageUrl} alt="Preview" style={{ maxHeight: '200px', borderRadius: '0.5rem', objectFit: 'contain' }} />
                                                <button type="button" className="button button-small button-danger" onClick={(e) => { e.stopPropagation(); setUploadedImageUrl(''); }}>Bild entfernen</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--card-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                                    <Icon name="image" size={20} />
                                                </div>
                                                <span style={{ fontWeight: 500 }}>Bild auswählen</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Empfänger Auswahl - Sauber in Segmented Tabs umgewandelt */}
                                <div className="form-group" style={{ marginBottom: 0, paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <label>Empfänger auswählen</label>
                                    <div className="segmented-tabs" style={{ marginBottom: '1rem' }}>
                                        <button type="button" className={`segmented-tab-btn ${audienceType === 'all' ? 'active' : ''}`} onClick={() => setAudienceType('all')}>Alle</button>
                                        <button type="button" className={`segmented-tab-btn ${audienceType === 'specific_levels' ? 'active' : ''}`} onClick={() => setAudienceType('specific_levels')}>Level</button>
                                        <button type="button" className={`segmented-tab-btn ${audienceType === 'specific_appointments' ? 'active' : ''}`} onClick={() => setAudienceType('specific_appointments')}>Kurse</button>
                                    </div>

                                    {audienceType === 'specific_levels' && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', animation: 'slideIn 0.2s ease-out' }}>
                                            {availableLevels.map((lvl: any) => (
                                                <button
                                                    key={lvl.id} type="button"
                                                    onClick={() => setSelectedLevelIds(prev => prev.includes(lvl.id) ? prev.filter(id => id !== lvl.id) : [...prev, lvl.id])}
                                                    className={`button button-small ${selectedLevelIds.includes(lvl.id) ? 'button-primary' : 'button-outline'}`}
                                                >
                                                    {lvl.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {audienceType === 'specific_appointments' && (
                                        <div style={{ animation: 'slideIn 0.2s ease-out' }}>
                                            <select
                                                className="form-input"
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if(val && !selectedAppointmentIds.includes(val)) setSelectedAppointmentIds([...selectedAppointmentIds, val]);
                                                }}
                                                value=""
                                            >
                                                <option value="" disabled>Kurs hinzufügen...</option>
                                                {availableAppointments.map((app: any) => (
                                                    <option key={app.id} value={app.id}>{app.title} ({new Date(app.start_time).toLocaleDateString()})</option>
                                                ))}
                                            </select>

                                            {selectedAppointmentIds.length > 0 && (
                                                <ul className="info-modal-list" style={{ marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                                                    {selectedAppointmentIds.map(id => {
                                                        const app = availableAppointments.find((a:any) => a.id === id);
                                                        if(!app) return null;
                                                        return (
                                                            <li key={id} style={{ padding: '0.5rem 1rem' }}>
                                                                <span>{app.title} <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>({new Date(app.start_time).toLocaleDateString()})</span></span>
                                                                <button type="button" className="action-icon-btn delete" onClick={() => setSelectedAppointmentIds(prev => prev.filter(i => i !== id))}><Icon name="x" size={16}/></button>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="button button-outline" onClick={resetForm}>Abbrechen</button>
                            <button type="submit" form="news-form" disabled={submitting || isUploading} className="button button-primary">
                                {submitting ? 'Speichert...' : (editingPost ? 'Speichern' : 'Veröffentlichen')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};