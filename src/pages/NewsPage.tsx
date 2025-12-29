import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { NewsPost, User } from '../types';
import Icon from '../components/ui/Icon';

interface NewsPageProps {
    user: User | any;
    token: string | null;
}

export const NewsPage: React.FC<NewsPageProps> = ({ user, token }) => {
    const [posts, setPosts] = useState<NewsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [submitting, setSubmitting] = useState(false);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getNews(token);
            setPosts(data);
        } catch (error) {
            console.error("Failed to load news", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [token]);

    // --- UPLOAD LOGIC ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `news_images/${Date.now()}_${fileName}`;

        setIsUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('notifications')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('notifications')
                .getPublicUrl(filePath);

            setUploadedImageUrl(publicUrl);

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('Upload fehlgeschlagen: ' + (error.message || error));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiClient.createNews({
                title: newTitle,
                content: newContent,
                image_url: uploadedImageUrl || undefined
            }, token);

            setNewTitle('');
            setNewContent('');
            setUploadedImageUrl('');
            setIsCreating(false);
            fetchNews();
        } catch (error) {
            alert('Fehler beim Erstellen des Beitrags');
        } finally {
            setSubmitting(false);
        }
    };

    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';

    if (loading) return (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Lade Neuigkeiten...</p>
        </div>
    );

    return (
        <div className="news-page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Neuigkeiten</h1>
                    <p>Aktuelle Informationen und Updates</p>
                </div>
                {isAdminOrStaff && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="button button-primary"
                    >
                        <Icon name="plus" /> <span className="hidden-mobile">Beitrag erstellen</span>
                    </button>
                )}
            </header>

            <div className="content-box" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                {posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-background)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                        <Icon name="file" style={{ width: '48px', height: '48px', color: 'var(--text-light)', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Keine Neuigkeiten</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Es wurden noch keine Beiträge veröffentlicht.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {posts.map(post => (
                            <article key={post.id} style={{
                                backgroundColor: 'var(--card-background)',
                                borderRadius: '1rem',
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {post.image_url && (
                                    /* HIER WURDE GEÄNDERT: Feste Höhe entfernt, Bild responsive gemacht */
                                    <div style={{ width: '100%', overflow: 'hidden' }}>
                                        <img
                                            src={post.image_url}
                                            alt={post.title}
                                            style={{
                                                width: '100%',
                                                height: 'auto', // Höhe automatisch anpassen
                                                display: 'block', // Verhindert Abstände unten
                                                objectFit: 'contain' // Stellt sicher, dass alles sichtbar ist (optional, da height:auto das meist regelt)
                                            }}
                                        />
                                    </div>
                                )}
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{post.title}</h2>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                            <Icon name="calendar" style={{ width: '16px', height: '16px' }} />
                                            {new Date(post.created_at).toLocaleDateString('de-DE')}
                                        </span>
                                    </div>
                                    <div style={{
                                        lineHeight: '1.7',
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {post.content}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal für neuen Beitrag */}
            {isCreating && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header blue">
                            <h2>Neuen Beitrag erstellen</h2>
                            <button className="close-button" onClick={() => setIsCreating(false)}><Icon name="x" /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreatePost} className="form-grid-single">
                                <div className="form-group">
                                    <label>Titel</label>
                                    <input
                                        type="text"
                                        required
                                        className="form-input"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="Wichtige Neuigkeiten..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Bild (Optional)</label>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />

                                    <div
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        style={{
                                            border: '2px dashed var(--border-color)',
                                            borderRadius: '0.5rem',
                                            padding: '2rem',
                                            textAlign: 'center',
                                            cursor: isUploading ? 'wait' : 'pointer',
                                            marginTop: '0.5rem',
                                            backgroundColor: uploadedImageUrl ? 'var(--background-secondary)' : 'transparent',
                                            transition: 'all 0.2s ease',
                                            opacity: isUploading ? 0.7 : 1
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                    >
                                        {isUploading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                                <Icon name="refresh" className="animate-spin" style={{ width: '24px', height: '24px' }} />
                                                <span>Bild wird hochgeladen...</span>
                                            </div>
                                        ) : uploadedImageUrl ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <img
                                                    src={uploadedImageUrl}
                                                    alt="Preview"
                                                    style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '0.5rem', objectFit: 'contain' }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <span className="button button-small button-outline">Anderes Bild wählen</span>
                                                    <button
                                                        type="button"
                                                        className="button button-small button-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setUploadedImageUrl('');
                                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                                        }}
                                                    >
                                                        Entfernen
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    background: 'var(--background-primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <Icon name="plus" />
                                                </div>
                                                <span style={{ fontWeight: 500 }}>Bild hochladen</span>
                                                <span style={{ fontSize: '0.8rem' }}>Klicken zum Auswählen</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Inhalt</label>
                                    <textarea
                                        required
                                        rows={6}
                                        className="form-input"
                                        style={{ height: 'auto', minHeight: '150px' }}
                                        value={newContent}
                                        onChange={e => setNewContent(e.target.value)}
                                        placeholder="Schreiben Sie hier Ihren Text..."
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="button button-outline" onClick={() => setIsCreating(false)}>Abbrechen</button>
                                    <button type="submit" disabled={submitting || isUploading} className="button button-primary">
                                        {submitting ? 'Wird gespeichert...' : 'Veröffentlichen'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};