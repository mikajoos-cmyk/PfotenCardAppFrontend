import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { NewsPost, User } from '../types';
import { hasPermission } from '../lib/permissions';
import { MOCK_NEWS } from '../lib/mockData';
import Icon from '../components/ui/Icon';

interface NewsPageProps {
    user: User | any;
    token: string | null;
    targetAppointmentId?: number;
    isPreviewMode?: boolean;
}

export const NewsPage: React.FC<NewsPageProps> = ({ user, token, targetAppointmentId, isPreviewMode }) => {
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
    const [editingPost, setEditingPost] = useState<NewsPost | null>(null);

    // Audience Selection State
    const [availableLevels, setAvailableLevels] = useState<any[]>([]);
    const [availableAppointments, setAvailableAppointments] = useState<any[]>([]);
    const [audienceType, setAudienceType] = useState<'all' | 'specific_levels' | 'specific_appointments'>('all');
    const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
    const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<number[]>([]);
    const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'past'>('upcoming');

    const filteredAppointments = availableAppointments
        .filter(app => {
            const isPast = new Date(app.start_time) < new Date();
            return appointmentFilter === 'past' ? isPast : !isPast;
        })
        .sort((a, b) => {
            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();
            if (appointmentFilter === 'upcoming') {
                return timeA - timeB; // Closest to now first (ascending)
            } else {
                return timeB - timeA; // Closest to now first (descending)
            }
        });

    // UI State for Custom Dropdowns
    const [isMainTypeDropdownOpen, setIsMainTypeDropdownOpen] = useState(false);
    const [isSpecificDropdownOpen, setIsSpecificDropdownOpen] = useState(false);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const data = isPreviewMode ? MOCK_NEWS : await apiClient.getNews(token);
            setPosts(data);
        } catch (error) {
            console.error("Failed to load news", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();

        // Fetch config for audience selection
        apiClient.getConfig().then(config => {
            if (config) {
                setAvailableLevels(config.levels || []);
                setAvailableAppointments(config.appointments || []);
            }
        }).catch(err => console.error("Failed to load config", err));
    }, [token]);

    useEffect(() => {
        if (targetAppointmentId) {
            setAudienceType('specific_appointments');
            setSelectedAppointmentIds([targetAppointmentId]);
            setIsCreating(true);
        }
    }, [targetAppointmentId]);

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
            fetchNews();
        } catch (error) {
            alert(editingPost ? 'Fehler beim Aktualisieren des Beitrags' : 'Fehler beim Erstellen des Beitrags');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewTitle('');
        setNewContent('');
        setUploadedImageUrl('');
        setAudienceType('all');
        setSelectedLevelIds([]);
        setSelectedAppointmentIds([]);
        setIsCreating(false);
        setEditingPost(null);
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
        if (!window.confirm('Möchten Sie diesen Beitrag wirklich löschen?')) return;

        try {
            await apiClient.deleteNews(postId, token);
            fetchNews();
        } catch (error) {
            alert('Fehler beim Löschen des Beitrags');
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
                {isAdminOrStaff && hasPermission(user, 'can_create_messages') && (
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
                                    <div style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        background: 'rgba(0,0,0,0.02)',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        <img
                                            src={post.image_url}
                                            alt={post.title}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '450px', // Begrenzt die Höhe
                                                width: 'auto',      // Verhindert das Strecken kleiner Bilder
                                                height: 'auto',
                                                display: 'block',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                )}
                                <div style={{ padding: '1.5rem' }}>
                                    <div className="news-item-header">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                            <h2 className="news-item-title">{post.title}</h2>
                                            {isAdminOrStaff && hasPermission(user, 'can_create_messages') && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleEditClick(post)}
                                                        className="button-icon"
                                                        title="Bearbeiten"
                                                        style={{
                                                            color: 'var(--text-secondary)',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Icon name="edit" style={{ width: '18px', height: '18px' }} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="button-icon"
                                                        title="Löschen"
                                                        style={{
                                                            color: 'var(--danger-color)',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: '4px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Icon name="trash" style={{ width: '18px', height: '18px' }} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="news-item-meta">
                                            <Icon name="calendar" style={{ width: '16px', height: '16px' }} />
                                            {new Date(post.created_at).toLocaleDateString('de-DE')}
                                            {post.author_name && (
                                                <>
                                                    <span style={{ margin: '0 0.3rem', opacity: 0.5 }}>•</span>
                                                    <Icon name="user" style={{ width: '16px', height: '16px' }} />
                                                    {post.author_name}
                                                </>
                                            )}
                                        </div>
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
            {
                isCreating && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header blue">
                                <h2>{editingPost ? 'Beitrag bearbeiten' : 'Neuen Beitrag erstellen'}</h2>
                                <button className="close-button" onClick={resetForm}><Icon name="x" /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleSubmit} className="form-grid-single">
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

                                    {/* AUDIENCE SELECTION - REFINED UI */}
                                    <div className="form-group" style={{
                                        borderTop: '1px solid var(--border-color)',
                                        paddingTop: '1.5rem',
                                        marginTop: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Empfänger auswählen</label>

                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {/* Main Dropdown */}
                                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                                <div
                                                    onClick={() => {
                                                        setIsMainTypeDropdownOpen(!isMainTypeDropdownOpen);
                                                        setIsSpecificDropdownOpen(false);
                                                    }}
                                                    className="form-input"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        background: 'var(--card-background)',
                                                        borderColor: isMainTypeDropdownOpen ? 'var(--primary-color)' : 'var(--border-color)',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <span>
                                                        {audienceType === 'all' && 'Alle Nutzer'}
                                                        {audienceType === 'specific_levels' && 'Bestimmte Level'}
                                                        {audienceType === 'specific_appointments' && 'Teilnehmer bestimmter Termine'}
                                                    </span>
                                                    <Icon name="chevron-down" style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        transform: isMainTypeDropdownOpen ? 'rotate(180deg)' : 'none',
                                                        transition: 'transform 0.2s ease'
                                                    }} />
                                                </div>

                                                {isMainTypeDropdownOpen && (
                                                    <>
                                                        <div
                                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                                                            onClick={() => setIsMainTypeDropdownOpen(false)}
                                                        />
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 5px)',
                                                            left: 0,
                                                            right: 0,
                                                            background: 'var(--card-background)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '0.75rem',
                                                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                            zIndex: 999,
                                                            overflow: 'hidden',
                                                            animation: 'slideUp 0.15s ease-out'
                                                        }}>
                                                            {[
                                                                { id: 'all', label: 'Alle Nutzer', icon: 'users' },
                                                                { id: 'specific_levels', label: 'Bestimmte Level', icon: 'award' },
                                                                { id: 'specific_appointments', label: 'Bestimmte Termine', icon: 'calendar' }
                                                            ].map(opt => (
                                                                <div
                                                                    key={opt.id}
                                                                    onClick={() => {
                                                                        setAudienceType(opt.id as any);
                                                                        setIsMainTypeDropdownOpen(false);
                                                                        setSelectedLevelIds([]);
                                                                        setSelectedAppointmentIds([]);
                                                                    }}
                                                                    style={{
                                                                        padding: '0.85rem 1rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.75rem',
                                                                        background: audienceType === opt.id ? 'var(--background-secondary)' : 'transparent',
                                                                        color: audienceType === opt.id ? 'var(--primary-color)' : 'var(--text-primary)',
                                                                        fontSize: '0.9rem',
                                                                        fontWeight: audienceType === opt.id ? 600 : 400
                                                                    }}
                                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--background-secondary)'}
                                                                    onMouseOut={e => e.currentTarget.style.background = audienceType === opt.id ? 'var(--background-secondary)' : 'transparent'}
                                                                >
                                                                    <Icon name={opt.icon} style={{ width: '18px', height: '18px' }} />
                                                                    {opt.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Specific Selection Dropdown */}
                                            {(audienceType === 'specific_levels' || audienceType === 'specific_appointments') && (
                                                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                                    {/* Filter Toggle for Appointments */}
                                                    {audienceType === 'specific_appointments' && (
                                                        <div style={{
                                                            display: 'flex',
                                                            background: 'var(--background-secondary)',
                                                            padding: '2px',
                                                            borderRadius: '2rem',
                                                            marginBottom: '0.5rem',
                                                            width: 'fit-content'
                                                        }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAppointmentFilter('upcoming')}
                                                                style={{
                                                                    padding: '0.35rem 1rem',
                                                                    borderRadius: '2rem',
                                                                    border: 'none',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    background: appointmentFilter === 'upcoming' ? 'var(--card-background)' : 'transparent',
                                                                    color: appointmentFilter === 'upcoming' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                                    boxShadow: appointmentFilter === 'upcoming' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                                                }}
                                                            >
                                                                Zukünftig
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAppointmentFilter('past')}
                                                                style={{
                                                                    padding: '0.35rem 1rem',
                                                                    borderRadius: '2rem',
                                                                    border: 'none',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    background: appointmentFilter === 'past' ? 'var(--card-background)' : 'transparent',
                                                                    color: appointmentFilter === 'past' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                                    boxShadow: appointmentFilter === 'past' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                                                }}
                                                            >
                                                                Vergangen
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div
                                                        onClick={() => setIsSpecificDropdownOpen(!isSpecificDropdownOpen)}
                                                        className="form-input"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            cursor: 'pointer',
                                                            background: 'var(--card-background)',
                                                            borderColor: isSpecificDropdownOpen ? 'var(--primary-color)' : 'var(--border-color)',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <span style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '180px'
                                                        }}>
                                                            {audienceType === 'specific_levels' ? (
                                                                selectedLevelIds.length === 0 ? 'Level wählen...' :
                                                                    selectedLevelIds.length === 1 ? availableLevels.find(l => l.id === selectedLevelIds[0])?.name :
                                                                        `${selectedLevelIds.length} Level ausgewählt`
                                                            ) : (
                                                                selectedAppointmentIds.length === 0 ? 'Termine wählen...' :
                                                                    selectedAppointmentIds.length === 1 ? availableAppointments.find(a => a.id === selectedAppointmentIds[0])?.title :
                                                                        `${selectedAppointmentIds.length} Termine ausgewählt`
                                                            )}
                                                        </span>
                                                        <Icon name="chevron-down" style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            transform: isSpecificDropdownOpen ? 'rotate(180deg)' : 'none',
                                                            transition: 'transform 0.2s ease'
                                                        }} />
                                                    </div>

                                                    {isSpecificDropdownOpen && (
                                                        <>
                                                            <div
                                                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                                                                onClick={() => setIsSpecificDropdownOpen(false)}
                                                            />
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 'calc(100% + 5px)',
                                                                left: 0,
                                                                right: 0,
                                                                background: 'var(--card-background)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '0.75rem',
                                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                                zIndex: 999,
                                                                maxHeight: '250px',
                                                                overflowY: 'auto',
                                                                animation: 'slideUp 0.15s ease-out'
                                                            }}>
                                                                {(audienceType === 'specific_levels' ? availableLevels : filteredAppointments).map(item => {
                                                                    const isSelected = audienceType === 'specific_levels' ?
                                                                        selectedLevelIds.includes(item.id) :
                                                                        selectedAppointmentIds.includes(item.id);

                                                                    const displayName = audienceType === 'specific_levels' ? item.name :
                                                                        `${item.title} (${new Date(item.start_time).toLocaleDateString('de-DE')})`;

                                                                    return (
                                                                        <div
                                                                            key={item.id}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (audienceType === 'specific_levels') {
                                                                                    if (isSelected) setSelectedLevelIds(selectedLevelIds.filter(id => id !== item.id));
                                                                                    else setSelectedLevelIds([...selectedLevelIds, item.id]);
                                                                                } else {
                                                                                    if (isSelected) setSelectedAppointmentIds(selectedAppointmentIds.filter(id => id !== item.id));
                                                                                    else setSelectedAppointmentIds([...selectedAppointmentIds, item.id]);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                padding: '0.75rem 1rem',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '0.75rem',
                                                                                background: isSelected ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                                                                                fontSize: '0.9rem',
                                                                                borderBottom: '1px solid var(--background-secondary)'
                                                                            }}
                                                                            onMouseOver={e => e.currentTarget.style.background = 'var(--background-secondary)'}
                                                                            onMouseOut={e => e.currentTarget.style.background = isSelected ? 'rgba(34, 197, 94, 0.05)' : 'transparent'}
                                                                        >
                                                                            <div style={{
                                                                                width: '18px',
                                                                                height: '18px',
                                                                                borderRadius: '4px',
                                                                                border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--text-light)'}`,
                                                                                background: isSelected ? 'var(--primary-color)' : 'transparent',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                transition: 'all 0.15s ease'
                                                                            }}>
                                                                                {isSelected && <Icon name="check" style={{ width: '12px', height: '12px', color: 'white' }} />}
                                                                            </div>
                                                                            <span style={{ fontWeight: isSelected ? 500 : 400, color: 'var(--text-primary)' }}>{displayName}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
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
                                        <button type="button" className="button button-outline" onClick={resetForm}>Abbrechen</button>
                                        <button type="submit" disabled={submitting || isUploading} className="button button-primary">
                                            {submitting ? 'Wird gespeichert...' : (editingPost ? 'Speichern' : 'Veröffentlichen')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};