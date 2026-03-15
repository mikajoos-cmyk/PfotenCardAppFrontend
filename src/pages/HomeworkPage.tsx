import React, { FC, useState } from 'react';
import { useHomework } from '../hooks/queries/useHomework';
import Icon from '../components/ui/Icon';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Neue shadcn/ui Komponenten importieren
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "../components/ui/dialog";

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

    if (homework.isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const openTasks = homework.data?.filter((hw: any) => !hw.is_completed) || [];
    const completedTasks = homework.data?.filter((hw: any) => hw.is_completed) || [];

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-10">
            {/* Header Area */}
            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Mein Trainingsplan</h1>
                <p className="text-muted-foreground text-lg">
                    Hier findest du deine aktuellen Hausaufgaben und Übungen.
                </p>
            </header>

            {/* Offene Aufgaben */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Icon name="calendar" size={20} />
                    </div>
                    <h2 className="text-xl font-semibold m-0">Offene Aufgaben</h2>
                    <Badge variant="secondary" className="ml-2 rounded-full px-2.5">
                        {openTasks.length}
                    </Badge>
                </div>

                {openTasks.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {openTasks.map((hw: any) => (
                            <AccordionItem
                                key={hw.id}
                                value={hw.id.toString()}
                                className="bg-card border border-border rounded-xl px-2 sm:px-6 shadow-sm overflow-hidden"
                            >
                                <AccordionTrigger className="hover:no-underline py-4">
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                            <Icon name="clipboard-list" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-foreground">{hw.title}</h3>
                                            <p className="text-sm text-muted-foreground font-normal line-clamp-1 mt-0.5">
                                                Klicken, um Details und Übungen anzuzeigen
                                            </p>
                                        </div>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="pt-2 pb-6 space-y-6">
                                    <div className="prose prose-sm sm:prose-base text-muted-foreground max-w-none">
                                        <p className="whitespace-pre-wrap leading-relaxed">{hw.description}</p>
                                    </div>

                                    {/* YouTube Video Embed */}
                                    {hw.video_url && (
                                        <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-muted/30">
                                            <div className="aspect-video w-full relative">
                                                <iframe
                                                    className="absolute inset-0 w-full h-full"
                                                    src={getYouTubeEmbedUrl(hw.video_url) || ''}
                                                    title="Übungsvideo"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Datei Anhänge */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {hw.file_url && (
                                            <a href={hw.file_url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:shadow-md transition-all">
                                                <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:scale-110 transition-transform">
                                                    <Icon name={getFileIcon(hw.file_name)} size={24} />
                                                </div>
                                                <span className="font-medium text-sm line-clamp-2">{hw.file_name || 'Anleitung öffnen'}</span>
                                            </a>
                                        )}

                                        {hw.attachments?.map((att: any, idx: number) => (
                                            <React.Fragment key={idx}>
                                                {att.type === 'video' ? (
                                                    <div className="col-span-1 sm:col-span-2 space-y-2 mt-2">
                                                        <video controls className="w-full rounded-xl border border-border shadow-sm max-h-[400px] bg-black">
                                                            <source src={att.file_url} type="video/mp4" />
                                                            Dein Browser unterstützt dieses Videoformat nicht.
                                                        </video>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 ml-1">
                                                            <Icon name="video" size={14} /> {att.file_name}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:shadow-md transition-all">
                                                        <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:scale-110 transition-transform">
                                                            <Icon name={getFileIcon(att.file_name, att.type)} size={24} />
                                                        </div>
                                                        <span className="font-medium text-sm line-clamp-2">{att.file_name || 'Datei öffnen'}</span>
                                                    </a>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            size="lg"
                                            className="w-full sm:w-auto gap-2"
                                            onClick={() => setFeedbackModal({ isOpen: true, assignmentId: hw.id })}
                                        >
                                            <Icon name="check-circle" size={18} />
                                            Als erledigt markieren
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <Card className="bg-muted/30 border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                                <Icon name="check" size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">Alles erledigt!</h3>
                            <p>Super gemacht. Du hast aktuell keine offenen Hausaufgaben.</p>
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* Erledigte Aufgaben */}
            {completedTasks.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border opacity-70">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                            <Icon name="check-circle" size={20} />
                        </div>
                        <h2 className="text-xl font-semibold m-0 text-muted-foreground">Bereits absolviert</h2>
                    </div>

                    <Accordion type="multiple" className="w-full space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                        {completedTasks.map((hw: any) => (
                            <AccordionItem
                                key={hw.id}
                                value={hw.id.toString()}
                                className="bg-card/50 border border-border rounded-xl px-2 sm:px-6 overflow-hidden"
                            >
                                <AccordionTrigger className="hover:no-underline py-3">
                                    <div className="flex items-center gap-3 text-left">
                                        <Icon name="check" className="text-emerald-500 shrink-0" size={20} />
                                        <span className="font-medium text-muted-foreground line-through decoration-muted-foreground/30">{hw.title}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-0 pb-4">
                                    <div className="pl-8 space-y-3 border-l-2 border-emerald-500/20 ml-2">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Icon name="calendar-check" size={14} />
                                            Erledigt am {new Date(hw.completed_at).toLocaleDateString('de-DE')}
                                        </div>
                                        {hw.client_feedback && (
                                            <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground italic">
                                                "{hw.client_feedback}"
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>
            )}

            {/* Feedback & Abschluss Modal (shadcn Dialog) */}
            <Dialog
                open={feedbackModal.isOpen}
                onOpenChange={(open) => !open && setFeedbackModal({ isOpen: false, assignmentId: null })}
            >
                <DialogContent className="sm:max-w-[500px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Icon name="award" className="text-orange-500" />
                            Übung abgeschlossen!
                        </DialogTitle>
                        <DialogDescription>
                            Wie lief das Training? Teile optional kurzes Feedback mit deinem Trainer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            rows={4}
                            placeholder="z.B. Lief gut, aber bei der Ablenkung hat der Hund noch Probleme..."
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            className="resize-none"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setFeedbackModal({ isOpen: false, assignmentId: null })}
                        >
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleComplete}
                            disabled={completeHomework.isPending}
                            className="gap-2"
                        >
                            {completeHomework.isPending && <LoadingSpinner size="sm" className="text-white" />}
                            Speichern & Abschließen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HomeworkPage;