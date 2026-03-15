import React, { FC, useState } from 'react';
import { useHomework } from '../hooks/queries/useHomework';
import Icon from '../components/ui/Icon';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface HomeworkPageProps {
    currentUser: any;
    token: string | null;
}

const HomeworkPage: FC<HomeworkPageProps> = ({ currentUser, token }) => {
    const { userHomework, completeHomework } = useHomework(token);
    const homework = userHomework(currentUser.id);
    const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; assignmentId: number | null }>({
        isOpen: false,
        assignmentId: null
    });
    const [feedbackText, setFeedbackText] = useState('');

    const handleComplete = async () => {
        if (!feedbackModal.assignmentId) return;

        try {
            await completeHomework.mutateAsync({
                id: feedbackModal.assignmentId,
                data: { client_feedback: feedbackText }
            });
            setFeedbackModal({ isOpen: false, assignmentId: null });
            setFeedbackText('');
        } catch (error) {
            console.error("Completion failed", error);
        }
    };

    if (homework.isLoading) return <LoadingSpinner />;

    const openTasks = homework.data?.filter((hw: any) => !hw.is_completed) || [];
    const completedTasks = homework.data?.filter((hw: any) => hw.is_completed) || [];

    return (
        <div className="homework-page p-4">
            <header className="mb-6">
                <h1>Mein Trainingsplan</h1>
                <p className="text-gray-600">Hier findest du deine aktuellen Hausaufgaben und Übungen.</p>
            </header>

            <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2">
                    <Icon name="calendar" /> Offene Aufgaben ({openTasks.length})
                </h2>
                {openTasks.length > 0 ? (
                    <div className="grid-container">
                        {openTasks.map((hw: any) => (
                            <div key={hw.id} className="card p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="m-0">{hw.title}</h3>
                                    <span className="badge badge-blue">Offen</span>
                                </div>
                                <p className="text-gray-700">{hw.description}</p>
                                
                                {hw.video_url && (
                                    <div className="video-container mt-2" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                                        <iframe 
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                            src={hw.video_url.includes('youtube.com') || hw.video_url.includes('youtu.be') ? hw.video_url.replace('watch?v=', 'embed/') : hw.video_url} 
                                            title="Video player" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowFullScreen
                                        />
                                    </div>
                                )}

                                {hw.file_url && (
                                    <a href={hw.file_url} target="_blank" rel="noopener noreferrer" className="button button-secondary flex items-center justify-center gap-2">
                                        <Icon name="file" /> {hw.file_name || 'Anleitung öffnen'}
                                    </a>
                                )}

                                {hw.attachments?.map((att: any, idx: number) => (
                                    <div key={idx} className="mt-2">
                                        {att.type === 'video' ? (
                                            <div className="video-upload-container mb-2">
                                                <video 
                                                    controls 
                                                    className="w-full rounded-lg" 
                                                    style={{ maxHeight: '300px', backgroundColor: '#000' }}
                                                >
                                                    <source src={att.file_url} type="video/mp4" />
                                                    Ihr Browser unterstützt dieses Videoformat nicht.
                                                </video>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Icon name="video" size={12} /> {att.file_name}
                                                </div>
                                            </div>
                                        ) : (
                                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="button button-secondary w-full flex items-center justify-center gap-2">
                                                <Icon name={att.type === 'image' ? 'image' : 'file'} /> {att.file_name || 'Datei öffnen'}
                                            </a>
                                        )}
                                    </div>
                                ))}

                                <button 
                                    className="button-primary w-full mt-2" 
                                    onClick={() => setFeedbackModal({ isOpen: true, assignmentId: hw.id })}
                                >
                                    Übung erledigt
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card p-8 text-center text-gray-500">
                        <Icon name="check" size={48} className="mb-2 opacity-20" />
                        <p>Super! Du hast alle aktuellen Hausaufgaben erledigt.</p>
                    </div>
                )}
            </section>

            {completedTasks.length > 0 && (
                <section>
                    <h2 className="mb-4 text-gray-500 flex items-center gap-2">
                        <Icon name="check" /> Erledigte Aufgaben
                    </h2>
                    <div className="grid-container opacity-75">
                        {completedTasks.map((hw: any) => (
                            <div key={hw.id} className="card p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="m-0 text-gray-600">{hw.title}</h3>
                                    <Icon name="check" className="text-green-500" />
                                </div>
                                {hw.client_feedback && (
                                    <p className="text-sm italic text-gray-500 mt-2 border-l-2 pl-3">
                                        Dein Feedback: "{hw.client_feedback}"
                                    </p>
                                )}
                                <div className="text-xs text-gray-400 mt-3">
                                    Erledigt am {new Date(hw.completed_at).toLocaleDateString('de-DE')}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {feedbackModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Übung abgeschlossen</h3>
                            <button className="modal-close" onClick={() => setFeedbackModal({ isOpen: false, assignmentId: null })}>
                                <Icon name="x" />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="mb-4">Wie lief das Training? (Optionales Feedback für deinen Trainer)</p>
                            <textarea 
                                className="form-input w-full" 
                                rows={4}
                                placeholder="z.B. Lief gut, aber bei der Ablenkung hat er noch Probleme..."
                                value={feedbackText}
                                onChange={e => setFeedbackText(e.target.value)}
                            />
                            <div className="modal-footer px-0 mt-4">
                                <button className="button-secondary" onClick={() => setFeedbackModal({ isOpen: false, assignmentId: null })}>Abbrechen</button>
                                <button className="button-primary" onClick={handleComplete} disabled={completeHomework.isPending}>
                                    Speichern & Abschließen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeworkPage;
