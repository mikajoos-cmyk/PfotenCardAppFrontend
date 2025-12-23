import React, { useEffect, useState, useMemo } from 'react';
import { apiClient, Appointment, Booking } from '../lib/api';
import { User } from '../types';
import Icon from '../components/ui/Icon';
import InfoModal from '../components/modals/InfoModal';

// --- HILFSFUNKTIONEN ---
const formatDate = (date: Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
const formatTime = (date: Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date) + ' Uhr';
const formatMonthYear = (date: Date) => new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Farben basierend auf Keywords
const getCategoryColor = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('welpe')) return 'orchid';
    if (t.includes('grund') || t.includes('basis') || t.includes('level 2')) return 'limegreen';
    if (t.includes('fort') || t.includes('level 3')) return 'skyblue';
    if (t.includes('master') || t.includes('level 4')) return 'peru';
    if (t.includes('prüfung')) return 'tomato';
    if (t.includes('theorie') || t.includes('vortrag')) return 'khaki';
    if (t.includes('workshop') || t.includes('special')) return 'darkkhaki';
    return 'gold';
};

// --- MODALS ---
const CreateAppointmentModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (data: any) => void }) => {
    const [formData, setFormData] = useState({ title: '', description: '', date: '', start_time: '', end_time: '', location: '', max_participants: 10 });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const start = new Date(`${formData.date}T${formData.start_time}`);
        const end = new Date(`${formData.date}T${formData.end_time}`);
        onCreate({
            title: formData.title,
            description: formData.description,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            location: formData.location,
            max_participants: Number(formData.max_participants)
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header blue">
                    <h2>Neuen Termin erstellen</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="form-grid-single">
                        <div className="form-group"><label>Titel</label><input required className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="z.B. Welpen-Spielstunde" /></div>
                        <div className="form-group row">
                            <div><label>Datum</label><input type="date" required className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            <div><label>Max. Teilnehmer</label><input type="number" required className="form-input" value={formData.max_participants} onChange={e => setFormData({ ...formData, max_participants: parseInt(e.target.value) })} /></div>
                        </div>
                        <div className="form-group row">
                            <div><label>Start</label><input type="time" required className="form-input" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} /></div>
                            <div><label>Ende</label><input type="time" required className="form-input" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label>Ort</label><input className="form-input" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Hundeplatz / Online" /></div>
                        <div className="form-group"><label>Beschreibung</label><textarea className="form-input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." /></div>
                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="button button-outline">Abbrechen</button>
                            <button type="submit" className="button button-primary">Erstellen</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ParticipantsModal = ({ isOpen, onClose, bookings, title, onToggleAttendance }: { isOpen: boolean, onClose: () => void, bookings: Booking[], title: string, onToggleAttendance: (id: number) => void }) => {
    if (!isOpen) return null;
    return (
        <InfoModal title={`Teilnehmer: ${title}`} color="blue" onClose={onClose}>
            <div className="participants-list-container">
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>{bookings.filter(b => b.status === 'confirmed').length} Anmeldungen</p>
                {bookings.length === 0 ? <p className="text-gray-500 italic">Noch keine Anmeldungen.</p> : (
                    <ul className="active-customer-list">
                        {bookings.map((b) => (
                            <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className={`initials-avatar small ${b.attended ? 'avatar-green' : 'avatar-gray'}`}>
                                        {b.user?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{b.user?.name || 'Unbekannt'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.status === 'confirmed' ? 'Bestätigt' : 'Storniert'}</div>
                                    </div>
                                </div>
                                {b.status === 'confirmed' && (
                                    <button
                                        onClick={() => onToggleAttendance(b.id)}
                                        className={`button button-small ${b.attended ? 'button-primary' : 'button-outline'}`}
                                    >
                                        {b.attended ? <><Icon name="check" /> Anwesend</> : 'Abstempeln'}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </InfoModal>
    );
};

const EventDetailsModal = ({ event, onClose, onAction, userRole, isBooked }: { event: Appointment, onClose: () => void, onAction: (type: 'book' | 'cancel' | 'participants') => void, userRole: string, isBooked: boolean }) => {
    if (!event) return null;
    const isFull = (event.participants_count || 0) >= event.max_participants;
    const isPast = new Date(event.start_time) < new Date();
    const date = new Date(event.start_time);

    return (
        <InfoModal title={event.title} color="blue" onClose={onClose}>
            <div className="event-detail-content">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name="calendar" /> {formatDate(date)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name="clock" /> {formatTime(date)}</div>
                    {event.location && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name="mapPin" /> {event.location}</div>}
                </div>

                <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>{event.description || 'Keine Beschreibung verfügbar.'}</p>

                <div className="detail-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    {userRole === 'admin' || userRole === 'mitarbeiter' ? (
                        <button className="button button-primary" onClick={() => onAction('participants')}>
                            <Icon name="users" /> Teilnehmerliste verwalten
                        </button>
                    ) : (
                        isBooked ? (
                            <button className="button button-danger" onClick={() => onAction('cancel')} disabled={isPast}>
                                <Icon name="x" /> Stornieren
                            </button>
                        ) : (
                            <button className="button button-primary" onClick={() => onAction('book')} disabled={isFull || isPast}>
                                {isFull ? 'Warteliste' : 'Jetzt anmelden'}
                            </button>
                        )
                    )}
                </div>
            </div>
        </InfoModal>
    );
};


// --- MAIN PAGE ---

interface AppointmentsPageProps {
    user: User | any;
    token: string | null;
}

export default function AppointmentsPage({ user, token }: AppointmentsPageProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [myBookings, setMyBookings] = useState<Set<number>>(new Set()); // IDs of appointments booked by user

    // Admin State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [currentParticipants, setCurrentParticipants] = useState<Booking[]>([]);
    const [currentApptTitle, setCurrentApptTitle] = useState('');

    // Detail Modal State
    const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);

    useEffect(() => {
        loadData();
    }, [token, user]);

    const loadData = async () => {
        setLoading(true);
        if (!token) {
            // Mock data for preview/demo
            setAppointments([
                { id: 1, title: 'Welpenstunde', description: 'Spiel & Spaß für die Kleinen.', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: '', location: 'Welpenwiese', max_participants: 8, participants_count: 5, created_at: '' },
                { id: 2, title: 'Level 2 - Grunderziehung', description: 'Sitz, Platz, Bleib unter Ablenkung.', start_time: new Date(Date.now() + 172800000).toISOString(), end_time: '', location: 'Platz 1', max_participants: 6, participants_count: 2, created_at: '' },
                { id: 3, title: 'Agility Workshop', description: 'Einsteiger-Kurs für sportliche Hunde.', start_time: new Date(Date.now() + 259200000).toISOString(), end_time: '', location: 'Halle', max_participants: 6, participants_count: 6, created_at: '' },
            ]);
            setLoading(false);
            return;
        }

        try {
            // Load appointments
            const appts = await apiClient.getAppointments(token);
            setAppointments(appts);

            // Load user bookings to check what is booked (if user is customer)
            // Ideally backend returns "is_booked" flag on appointments, but we can infer or fetch separately.
            // For now, we assume we might need a separate endpoint or the backend handles it.
            // Simplified: If we had a list of my bookings. Let's assume we don't have it easily 
            // without fetching all bookings. We will trust the button interaction returns state.
            // WORKAROUND: For this UI, we track local interactions or if the backend provided `user_booking` in `appts` (custom backend logic).
            // Let's assume we fetch `my-bookings` if customer.
            // Since `apiClient` doesn't have `getMyBookings`, we rely on `getAppointments` maybe returning that info?
            // If not, we skip the "Booked" indicator on load for this specific snippet unless modified backend.
        } catch (e: any) {
            console.error("API Error:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleCreate = async (data: any) => {
        try {
            await apiClient.createAppointment(data, token);
            setIsCreateOpen(false);
            loadData();
        } catch (e) {
            alert("Fehler beim Erstellen");
        }
    };

    const handleAction = async (type: 'book' | 'cancel' | 'participants', event: Appointment) => {
        if (type === 'participants') {
            handleViewParticipants(event);
            return;
        }

        try {
            if (type === 'book') {
                await apiClient.bookAppointment(event.id, token);
                alert("Erfolgreich angemeldet!");
                setMyBookings(prev => new Set(prev).add(event.id)); // Optimistic UI
            } else {
                await apiClient.cancelAppointment(event.id, token);
                alert("Storniert.");
                setMyBookings(prev => { const next = new Set(prev); next.delete(event.id); return next; });
            }
            setSelectedEvent(null); // Close modal
            loadData(); // Refresh data
        } catch (e: any) {
            alert(e.message || "Aktion fehlgeschlagen");
        }
    };

    const handleViewParticipants = async (event: Appointment) => {
        setCurrentApptTitle(event.title);
        try {
            const parts = await apiClient.getParticipants(event.id, token);
            setCurrentParticipants(parts);
            setParticipantsOpen(true);
            setSelectedEvent(null); // Close detail modal if open
        } catch (e) {
            console.error(e);
            alert("Konnte Teilnehmer nicht laden.");
        }
    };

    const handleToggleAttendance = async (bookingId: number) => {
        try {
            const updated = await apiClient.toggleAttendance(bookingId, token);
            setCurrentParticipants(prev => prev.map(b => b.id === bookingId ? updated : b));
        } catch (e: any) {
            alert("Fehler beim Ändern des Status");
        }
    };

    // --- GROUPING LOGIC ---
    const eventsByWeek = useMemo(() => {
        const now = new Date();
        const futureEvents = appointments
            .filter(a => new Date(a.start_time) >= new Date(now.setHours(0, 0, 0, 0)))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        const groups: { header: string; events: Appointment[] }[] = [];
        let currentGroup: { header: string; events: Appointment[] } | null = null;
        let lastKey = '';

        const getWeek = (d: Date) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        }

        futureEvents.forEach(event => {
            const date = new Date(event.start_time);
            const year = date.getFullYear();
            const week = getWeek(date);
            const key = `${year}-${week}`;

            if (key !== lastKey) {
                lastKey = key;
                currentGroup = {
                    header: `${date.toLocaleString('de-DE', { month: 'long', year: 'numeric' })} - KW ${week}`,
                    events: []
                };
                groups.push(currentGroup);
            }
            if (currentGroup) currentGroup.events.push(event);
        });

        return groups;
    }, [appointments]);

    return (
        <div className="appointments-page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Termine & Events</h1>
                    <p>Finde den passenden Kurs für dich und deinen Hund.</p>
                </div>
                {user?.role === 'admin' && (
                    <button className="button button-primary" onClick={() => setIsCreateOpen(true)}>
                        <Icon name="plus" /> Termin erstellen
                    </button>
                )}
            </header>

            {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Lade Termine...</div> : (
                <div className="event-list-container">
                    {eventsByWeek.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Aktuell keine Termine verfügbar.</p>
                    ) : (
                        eventsByWeek.map(group => (
                            <div key={group.header} className="week-group">
                                <h3 className="week-header">{group.header}</h3>
                                <ul className="event-list-styled">
                                    {group.events.map(event => {
                                        const date = new Date(event.start_time);
                                        const isFull = (event.participants_count || 0) >= event.max_participants;
                                        const colorClass = `cat-${getCategoryColor(event.title)}`;
                                        const free = event.max_participants - (event.participants_count || 0);

                                        return (
                                            <li
                                                key={event.id}
                                                className={`event-item-styled ${colorClass}`}
                                                onClick={() => setSelectedEvent(event)}
                                            >
                                                <div className="event-details">
                                                    <div className="event-line-1">
                                                        <span className="event-title">{event.title}</span>
                                                    </div>
                                                    <div className="event-line-2">
                                                        <span>{formatDate(date)} &bull; {formatTime(date)}</span>
                                                        {event.location && <span className="event-location">&bull; {event.location}</span>}
                                                    </div>
                                                </div>

                                                <div className="event-actions">
                                                    {/* Anzeige für Kapazität */}
                                                    <div className={`event-capacity ${isFull ? 'full' : ''}`}>
                                                        {isFull ? 'Ausgebucht' : `${free} Plätze frei`}
                                                    </div>

                                                    {/* Schnell-Aktion Button (Desktop) */}
                                                    <div className="quick-action-btn">
                                                        {user.role === 'admin' ? (
                                                            <button
                                                                className="button button-outline button-small"
                                                                onClick={(e) => { e.stopPropagation(); handleViewParticipants(event); }}
                                                            >
                                                                Teilnehmer
                                                            </button>
                                                        ) : (
                                                            !isFull && (
                                                                <button
                                                                    className="button button-primary button-small"
                                                                    onClick={(e) => { e.stopPropagation(); handleAction('book', event); }}
                                                                >
                                                                    Anmelden
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </div>
            )}

            <CreateAppointmentModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreate={handleCreate} />

            <ParticipantsModal
                isOpen={participantsOpen}
                onClose={() => setParticipantsOpen(false)}
                bookings={currentParticipants}
                title={currentApptTitle}
                onToggleAttendance={handleToggleAttendance}
            />

            {selectedEvent && (
                <EventDetailsModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onAction={(type) => handleAction(type, selectedEvent)}
                    userRole={user?.role}
                    isBooked={myBookings.has(selectedEvent.id)}
                />
            )}
        </div>
    );
}