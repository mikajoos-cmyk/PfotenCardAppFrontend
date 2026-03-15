import React, { FC, useState } from 'react';
import { useHomework } from '../hooks/queries/useHomework';
import Icon from '../components/ui/Icon';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import InfoModal from '../components/modals/InfoModal';

// Hilfsfunktion für Datei-Icons
const getFileIcon = (fileName: string, type?: string) => {
    if (type === 'video') return 'video';
    if (type === 'image') return 'image';

    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'file-text';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif': return 'image';
        case 'mp4':
        case 'mov':
        case 'avi': return 'video';
        default: return 'file';
    }
};

// Hilfsfunktion: Zuverlässiges Extrahieren von YouTube-Embed-Links
const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
};

interface HomeworkPageProps {
    currentUser: any;
    token: string | null;
}

const HomeworkPage: FC<HomeworkPageProps> = ({ currentUser, token }) => {
    const { userHomework, completeHomework } = useHomework(token);
    const homework = userHomework(currentUser.id);

    const [openTaskIds, setOpenTaskIds] = useState<number[]>([]);
    const [openCompletedIds, setOpenCompletedIds] = useState<number[]>([]);

    const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; assignmentId: number | null }>({
        isOpen: false,
        assignmentId: null
    });
    const [feedbackText, setFeedbackText] = useState('');

    const toggleTask = (id: number, isCompletedList: boolean = false) => {
        if (isCompletedList) {
            setOpenCompletedIds(prev => prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]);
        } else {
            setOpenTaskIds(prev => prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]);
        }
    };

    const handleComplete = async () => {
        if (!feedbackModal.assignmentId) return;

        try {
            await completeHomework.mutateAsync({
                id: feedbackModal.assignmentId,
                data: { client_feedback: feedbackText }
            });
            setFeedbackModal({ isOpen: false, assignmentId: null });
            setFeedbackText('');
            // Optional: Task aus den "offenen" zuklappen
            setOpenTaskIds(prev => prev.filter(id => id !== feedbackModal.assignmentId));
        } catch (error) {
            console.error("Completion failed", error);
        }
    };

    if (homework.isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <LoadingSpinner message="Lade Trainingsplan..." />
            </div>
        );
    }

    const openTasks = homework.data?.filter((hw: any) => !hw.is_completed) || [];
    const completedTasks = homework.data?.filter((hw: any) => hw.is_completed) || [];

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header Area */}
            <header className="page-header">
                <h1>Mein Trainingsplan</h1>
                <p>Hier findest du deine aktuellen Hausaufgaben und Übungen.</p>
            </header>

            {/* Offene Aufgaben */}
            <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-accent-blue)', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="calendar" style={{ width: '20px', height: '20px' }} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Offene Aufgaben</h2>
                    <span style={{ backgroundColor: 'var(--card-background-hover)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                        {openTasks.length}
                    </span>
                </div>

                {openTasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {openTasks.map((hw: any) => {
                            const isExpanded = openTaskIds.includes(hw.id);
                            return (
                                <div key={hw.id} className="content-box" style={{ padding: 0, overflow: 'hidden', transition: 'all 0.2s ease', borderColor: isExpanded ? 'var(--primary-color)' : 'var(--border-color)' }}>
                                    {/* Accordion Trigger */}
                                    <div
                                        onClick={() => toggleTask(hw.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', cursor: 'pointer',
                                            backgroundColor: isExpanded ? 'var(--bg-accent-green)' : 'transparent',
                                            transition: 'background-color 0.2s ease'
                                        }}
                                    >
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-accent-orange)', color: 'var(--brand-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon name="file-text" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{hw.title}</h3>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Zugeordnet am {new Date(hw.created_at).toLocaleDateString('de-DE')}
                                            </p>
                                        </div>
                                        <Icon
                                            name="chevron-down"
                                            style={{ color: 'var(--text-secondary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                                        />
                                    </div>

                                    {/* Accordion Content */}
                                    {isExpanded && (
                                        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                                            {hw.description && (
                                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                                                    {hw.description}
                                                </p>
                                            )}

                                            {/* YouTube Video Embed */}
                                            {hw.video_url && (
                                                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '0.75rem', marginBottom: '1.5rem', backgroundColor: '#000' }}>
                                                    <iframe
                                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                        src={getYouTubeEmbedUrl(hw.video_url) || ''}
                                                        title="Übungsvideo"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                </div>
                                            )}

                                            {/* Datei Anhänge im Stil der App Document-List */}
                                            {(hw.file_url || (hw.attachments && hw.attachments.length > 0)) && (
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anhänge & Materialien</h4>
                                                    <ul className="document-list" style={{ marginTop: 0 }}>
                                                        {hw.file_url && (
                                                            <li>
                                                                <Icon name={getFileIcon(hw.file_name)} className="doc-icon" style={{ color: 'var(--brand-green)' }} />
                                                                <div className="doc-info" onClick={() => window.open(hw.file_url, '_blank')} role="button" tabIndex={0}>
                                                                    <div className="doc-name">{hw.file_name || 'Hauptdokument'}</div>
                                                                    <div className="doc-size">Datei ansehen</div>
                                                                </div>
                                                                <div className="doc-actions">
                                                                    <button className="action-icon-btn" onClick={() => window.open(hw.file_url, '_blank')}><Icon name="download" /></button>
                                                                </div>
                                                            </li>
                                                        )}
                                                        {hw.attachments?.map((att: any, idx: number) => (
                                                            <li key={idx}>
                                                                <Icon name={att.type === 'video' ? 'video' : getFileIcon(att.file_name, att.type)} className="doc-icon" style={{ color: att.type === 'video' ? 'var(--brand-red)' : 'var(--brand-blue)' }} />
                                                                <div className="doc-info" onClick={() => window.open(att.file_url, '_blank')} role="button" tabIndex={0}>
                                                                    <div className="doc-name">{att.file_name || 'Anhang'}</div>
                                                                    <div className="doc-size">{att.type === 'video' ? 'Video ansehen' : 'Datei ansehen'}</div>
                                                                </div>
                                                                <div className="doc-actions">
                                                                    <button className="action-icon-btn" onClick={() => window.open(att.file_url, '_blank')}><Icon name="download" /></button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                                <button
                                                    className="button button-primary"
                                                    onClick={() => setFeedbackModal({ isOpen: true, assignmentId: hw.id })}
                                                >
                                                    <Icon name="check-circle" /> Als erledigt markieren
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-background)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
                        <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem auto', backgroundColor: 'var(--bg-accent-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-green)' }}>
                            <Icon name="check" style={{ width: '32px', height: '32px' }} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Alles erledigt!</h3>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Super gemacht. Du hast aktuell keine offenen Hausaufgaben.</p>
                    </div>
                )}
            </section>

            {/* Erledigte Aufgaben */}
            {completedTasks.length > 0 && (
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', opacity: 0.8 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-accent-green)', color: 'var(--brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="check-circle" style={{ width: '20px', height: '20px' }} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-secondary)' }}>Bereits absolviert</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.85 }}>
                        {completedTasks.map((hw: any) => {
                            const isExpanded = openCompletedIds.includes(hw.id);
                            return (
                                <div key={hw.id} className="content-box" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div
                                        onClick={() => toggleTask(hw.id, true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', cursor: 'pointer'
                                        }}
                                    >
                                        <Icon name="check" style={{ color: 'var(--brand-green)' }} />
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>{hw.title}</h3>
                                        </div>
                                        <Icon
                                            name="chevron-down"
                                            style={{ color: 'var(--text-secondary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                                        />
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '0 1.5rem 1.5rem 4rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                <Icon name="calendar" style={{ width: '14px', height: '14px' }} />
                                                Erledigt am {new Date(hw.completed_at).toLocaleDateString('de-DE')}
                                            </div>
                                            {hw.client_feedback && (
                                                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', borderLeft: '3px solid var(--brand-green)' }}>
                                                    "{hw.client_feedback}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Feedback Modal */}
            {feedbackModal.isOpen && (
                <InfoModal
                    title="Übung abgeschlossen!"
                    color="green"
                    onClose={() => setFeedbackModal({ isOpen: false, assignmentId: null })}
                >
                    <div style={{ padding: '0.5rem 0' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Wie lief das Training? Teile optional ein kurzes Feedback mit deinem Trainer.
                        </p>

                        <div className="form-group">
                            <label>Dein Feedback (Optional)</label>
                            <textarea
                                className="form-input"
                                rows={4}
                                placeholder="z.B. Lief gut, aber bei der Ablenkung hat der Hund noch Probleme..."
                                value={feedbackText}
                                onChange={e => setFeedbackText(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                className="button button-outline"
                                style={{ flex: 1 }}
                                onClick={() => setFeedbackModal({ isOpen: false, assignmentId: null })}
                            >
                                Abbrechen
                            </button>
                            <button
                                className="button button-primary"
                                style={{ flex: 1, backgroundColor: 'var(--brand-green)', borderColor: 'var(--brand-green)' }}
                                onClick={handleComplete}
                                disabled={completeHomework.isPending}
                            >
                                {completeHomework.isPending ? 'Speichere...' : 'Speichern & Abschließen'}
                            </button>
                        </div>
                    </div>
                </InfoModal>
            )}
        </div>
    );
};

export default HomeworkPage;