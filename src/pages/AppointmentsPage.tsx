import React, { useEffect, useState, useMemo } from 'react';
import { apiClient, Appointment, Booking } from '../lib/api';
import { User, View } from '../types';
import Icon from '../components/ui/Icon';
import InfoModal from '../components/modals/InfoModal';

// --- MOCK DATEN FÜR PREVIEW ---
const MOCK_APPOINTMENTS: any[] = [
    { id: 101, title: 'Welpenstunde', description: 'Spiel & Spaß für die Kleinen.', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: new Date(Date.now() + 90000000).toISOString(), location: 'Welpenwiese', max_participants: 8, participants_count: 5 },
    { id: 102, title: 'Level 2 - Grunderziehung', description: 'Sitz, Platz, Bleib unter Ablenkung.', start_time: new Date(Date.now() + 172800000).toISOString(), end_time: new Date(Date.now() + 176400000).toISOString(), location: 'Platz 1', max_participants: 6, participants_count: 2 },
    { id: 103, title: 'Agility Workshop', description: 'Einsteiger-Kurs für sportliche Hunde.', start_time: new Date(Date.now() + 259200000).toISOString(), end_time: new Date(Date.now() + 262800000).toISOString(), location: 'Halle', max_participants: 6, participants_count: 6 },
    { id: 104, title: 'Prüfungs-Vorbereitung', description: 'Intensivtraining für den Hundeführerschein.', start_time: new Date(Date.now() + 345600000).toISOString(), end_time: new Date(Date.now() + 349200000).toISOString(), location: 'Stadtpark', max_participants: 4, participants_count: 4 },
];

// --- HILFSFUNKTIONEN ---
const formatDate = (date: Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
const formatTime = (date: Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date) + ' Uhr';

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
                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}><label>Datum</label><input type="date" required className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            <div style={{ flex: 1 }}><label>Max. Teilnehmer</label><input type="number" required className="form-input" value={formData.max_participants} onChange={e => setFormData({ ...formData, max_participants: parseInt(e.target.value) })} /></div>
                        </div>
                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}><label>Start</label><input type="time" required className="form-input" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} /></div>
                            <div style={{ flex: 1 }}><label>Ende</label><input type="time" required className="form-input" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} /></div>
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

// Update: Eigenes Modal-Layout für bessere Button-Positionierung
const EventDetailsModal = ({ event, onClose, onAction, userRole, isBooked, bookingStatus, onNotify }: { event: Appointment, onClose: () => void, onAction: (type: 'book' | 'cancel' | 'participants') => void, userRole: string, isBooked: boolean, bookingStatus?: string, onNotify: () => void }) => {
    if (!event) return null;
    const isFull = (event.participants_count || 0) >= event.max_participants;
    const isPast = new Date(event.start_time) < new Date();
    const date = new Date(event.start_time);

    // Header Farbe basierend auf Event-Titel
    const headerColorClass = getCategoryColor(event.title) === 'orchid' ? 'purple'
        : getCategoryColor(event.title) === 'tomato' ? 'red'
            : 'blue';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`modal-header ${headerColorClass}`}>
                    <h2 style={{ color: 'white' }}>{event.title}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Icon name="calendar" style={{ color: 'var(--primary-color)' }} />
                            <span style={{ fontWeight: 500 }}>{formatDate(date)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Icon name="clock" style={{ color: 'var(--primary-color)' }} />
                            <span style={{ fontWeight: 500 }}>{formatTime(date)}</span>
                        </div>
                    </div>
                    {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            <Icon name="mapPin" style={{ color: 'var(--primary-color)' }} />
                            <span>{event.location}</span>
                        </div>
                    )}

                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Beschreibung</h4>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
                        {event.description || 'Keine weitere Beschreibung verfügbar.'}
                    </p>
                </div>

                {/* Footer mit Buttons nebeneinander */}
                <div className="modal-footer">
                    <button className="button button-outline" onClick={onClose}>Schließen</button>

                    {userRole === 'admin' || userRole === 'mitarbeiter' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="button button-outline" onClick={onNotify} title="Teilnehmer benachrichtigen">
                                <Icon name="bell" />
                            </button>
                            <button className="button button-primary" onClick={() => onAction('participants')}>
                                <Icon name="users" /> Teilnehmerliste
                            </button>
                        </div>
                    ) : (
                        isBooked ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {bookingStatus === 'waitlist' && (
                                    <button className="button button-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                        <Icon name="clock" /> Auf der Warteliste
                                    </button>
                                )}
                                <button className="button button-danger" onClick={() => onAction('cancel')} disabled={isPast}>
                                    <Icon name="x" /> Stornieren
                                </button>
                            </div>
                        ) : (
                            <button
                                className="button button-primary"
                                onClick={() => onAction('book')}
                                disabled={isPast}
                            >
                                {isFull ? 'Auf die Warteliste' : 'Jetzt anmelden'}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const ParticipantsModal = ({ isOpen, onClose, bookings, title, onToggleAttendance }: { isOpen: boolean, onClose: () => void, bookings: Booking[], title: string, onToggleAttendance: (id: number) => void }) => {
    const [activeTab, setActiveTab] = useState<'confirmed' | 'waitlist'>('confirmed');

    if (!isOpen) return null;

    const confirmedList = bookings.filter(b => b.status === 'confirmed');
    const waitlistList = bookings.filter(b => b.status === 'waitlist');

    // Sortiere Warteliste nach Erstellungsdatum (älteste zuerst)
    waitlistList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const currentList = activeTab === 'confirmed' ? confirmedList : waitlistList;

    return (
        <InfoModal title={`Teilnehmer: ${title}`} color="blue" onClose={onClose}>
            <div className="participants-list-container">

                {/* TABS FÜR ANSICHTSWECHSEL */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <button
                        onClick={() => setActiveTab('confirmed')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderBottom: activeTab === 'confirmed' ? '2px solid var(--primary-color)' : '2px solid transparent',
                            fontWeight: activeTab === 'confirmed' ? 600 : 400,
                            color: activeTab === 'confirmed' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer'
                        }}
                    >
                        Teilnehmer ({confirmedList.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderBottom: activeTab === 'waitlist' ? '2px solid var(--brand-orange)' : '2px solid transparent',
                            fontWeight: activeTab === 'waitlist' ? 600 : 400,
                            color: activeTab === 'waitlist' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer'
                        }}
                    >
                        Warteliste ({waitlistList.length})
                    </button>
                </div>

                {currentList.length === 0 ? <p className="text-gray-500 italic">Keine Einträge in dieser Liste.</p> : (
                    <ul className="active-customer-list">
                        {currentList.map((b, index) => (
                            <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {/* Nummerierung für Warteliste anzeigen */}
                                    {activeTab === 'waitlist' && (
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: 'var(--bg-accent-orange)', color: 'var(--brand-orange)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold'
                                        }}>
                                            {index + 1}
                                        </div>
                                    )}

                                    <div className={`initials-avatar small ${b.attended ? 'avatar-green' : 'avatar-gray'}`}>
                                        {b.user?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{b.user?.name || 'Unbekannt'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {activeTab === 'waitlist'
                                                ? `Wartet seit: ${new Date(b.created_at).toLocaleDateString()}`
                                                : (b.status === 'confirmed' ? 'Bestätigt' : 'Storniert')}
                                        </div>
                                    </div>
                                </div>
                                {activeTab === 'confirmed' && b.status === 'confirmed' && (
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

// --- MAIN PAGE ---

export default function AppointmentsPage({ user, token, setView }: { user: User | any, token: string | null, setView?: (view: View) => void }) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    // ÄNDERUNG: Status statt nur ID speichern (Map<ID, Status>)
    const [myBookings, setMyBookings] = useState<Map<number, string>>(new Map());
    const isPreview = !token || token === 'preview-token';

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

        // Automatische Erkennung für Preview-Modus
        if (isPreview) {
            console.log("Lade Preview-Daten für Termine...");
            setAppointments(MOCK_APPOINTMENTS);
            setLoading(false);
            return;
        }

        try {
            const [appts, bookings] = await Promise.all([
                apiClient.getAppointments(token),
                apiClient.getMyBookings(token).catch(e => {
                    console.warn("Could not fetch user bookings:", e);
                    return [];
                })
            ]);
            setAppointments(appts);
            if (Array.isArray(bookings)) {
                const bookingMap = new Map<number, string>();
                bookings.forEach((b: any) => bookingMap.set(b.appointment_id, b.status));
                setMyBookings(bookingMap);
            }
        } catch (e: any) {
            console.error("API Error:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleCreate = async (data: any) => {
        if (isPreview) {
            const newAppt = { ...data, id: Date.now(), participants_count: 0 };
            setAppointments([...appointments, newAppt]);
            setIsCreateOpen(false);
            return;
        }

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

        if (isPreview) {
            // ... (Preview Logic bleibt gleich)
            if (type === 'book') {
                // Simulate Waitlist if full
                const isFull = (event.participants_count || 0) >= event.max_participants;
                const status = isFull ? 'waitlist' : 'confirmed';
                setMyBookings(prev => new Map(prev).set(event.id, status));

                if (status === 'waitlist') {
                    alert("Preview: Du bist auf der Warteliste.");
                } else {
                    alert("Preview: Erfolgreich angemeldet!");
                }
            } else {
                setMyBookings(prev => { const next = new Map(prev); next.delete(event.id); return next; });
                alert("Preview: Storniert.");
            }
            setSelectedEvent(null);
            return;
        }

        try {
            if (type === 'book') {
                const response = await apiClient.bookAppointment(event.id, token);
                // API sollte das Booking-Objekt zurückgeben
                if (response.status === 'waitlist') {
                    alert("Du wurdest auf die Warteliste gesetzt! Wir informieren dich, sobald ein Platz frei wird.");
                    setMyBookings(prev => new Map(prev).set(event.id, 'waitlist'));
                } else {
                    alert("Erfolgreich angemeldet!");
                    setMyBookings(prev => new Map(prev).set(event.id, 'confirmed'));
                }
            } else {
                const result = await apiClient.cancelAppointment(event.id, token);
                alert("Storniert.");
                if (result.promoted_user_id) {
                    // Info für den Admin (optional, oder nur Console Log)
                    console.log("User wurde nachgerückt:", result.promoted_user_id);
                }
                setMyBookings(prev => {
                    const next = new Map(prev);
                    next.delete(event.id);
                    return next;
                });
            }
            setSelectedEvent(null);
            loadData(); // Lädt die Zahlen neu (Teilnehmerzahl etc.)
        } catch (e: any) {
            alert(e.message || "Aktion fehlgeschlagen");
        }
    };

    const handleNotifyParticipants = (event: Appointment) => {
        if (setView) {
            setView({ page: 'news', targetAppointmentId: event.id });
        }
    };

    const handleViewParticipants = async (event: Appointment) => {
        setCurrentApptTitle(event.title);

        if (isPreview) {
            setCurrentParticipants([
                { id: 1, user: { name: 'Max Mustermann' }, status: 'confirmed', attended: false } as any,
                { id: 2, user: { name: 'Anna Beispiel' }, status: 'confirmed', attended: true } as any
            ]);
            setParticipantsOpen(true);
            setSelectedEvent(null);
            return;
        }

        try {
            const parts = await apiClient.getParticipants(event.id, token);
            setCurrentParticipants(parts);
            setParticipantsOpen(true);
            setSelectedEvent(null);
        } catch (e) {
            console.error(e);
            alert("Konnte Teilnehmer nicht laden.");
        }
    };

    const handleToggleAttendance = async (bookingId: number) => {
        if (isPreview) {
            setCurrentParticipants(prev => prev.map(b => b.id === bookingId ? { ...b, attended: !b.attended } : b));
            return;
        }

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
        // Zeige auch Events von heute an (Hours 0 setzten)
        const displayStart = new Date(now.setHours(0, 0, 0, 0));

        const futureEvents = appointments
            .filter(a => new Date(a.start_time) >= displayStart)
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
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Termine & Events</h1>
                    <p>Finde den passenden Kurs für dich und deinen Hund.</p>
                </div>

                {user?.role === 'admin' && (
                    <button className="button button-primary" onClick={() => setIsCreateOpen(true)}>
                        <Icon name="plus" /> <span className="hidden-mobile">Termin erstellen</span>
                    </button>
                )}
            </header>

            {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Lade Termine...</div> : (
                <div className="event-list-container">
                    {eventsByWeek.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-background)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                            <Icon name="calendar" style={{ width: '48px', height: '48px', color: 'var(--text-light)', marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Aktuell sind keine Termine eingetragen.</p>
                            {user?.role === 'admin' && (
                                <button className="button button-primary" onClick={() => setIsCreateOpen(true)}>Ersten Termin erstellen</button>
                            )}
                        </div>
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
                                        const isBooked = myBookings.has(event.id);

                                        const bookingStatus = myBookings.get(event.id); // 'confirmed' oder 'waitlist'

                                        return (
                                            <li
                                                key={event.id}
                                                className={`event-item-styled ${colorClass}`}
                                            >
                                                {/* Klickbarer Bereich für Details */}
                                                <div className="event-details" onClick={() => setSelectedEvent(event)}>
                                                    <span className="event-title">{event.title}</span>
                                                    <div className="event-line-2">
                                                        <span>{formatDate(date)} &bull; {formatTime(date)}</span>
                                                        {event.location && <span className="event-location">&bull; {event.location}</span>}
                                                    </div>
                                                </div>

                                                {/* Aktions-Bereich rechts */}
                                                {(user.role === 'admin' || user.role === 'mitarbeiter') && (
                                                    <button
                                                        className="button button-outline button-small notify-bell-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleNotifyParticipants(event); }}
                                                        title="Teilnehmer benachrichtigen"
                                                    >
                                                        <Icon name="bell" />
                                                    </button>
                                                )}

                                                <div className="event-actions">
                                                    <div className={`event-capacity ${isFull ? 'full' : ''}`}>
                                                        {isFull ? 'Ausgebucht' : `${free} Plätze frei`}
                                                    </div>

                                                    {/* Direkt-Buttons für Desktop */}
                                                    <div className="quick-action-btn">
                                                        {user.role === 'admin' || user.role === 'mitarbeiter' ? (
                                                            <button
                                                                className="button button-outline button-small"
                                                                onClick={(e) => { e.stopPropagation(); handleViewParticipants(event); }}
                                                            >
                                                                Teilnehmer
                                                            </button>
                                                        ) : (
                                                            /* ÄNDERUNG: List View Button Logik */
                                                            isBooked ? (
                                                                bookingStatus === 'waitlist' ? (
                                                                    <button className="button button-primary button-small" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                                                        <Icon name="clock" style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                                                        Auf der Warteliste
                                                                    </button>
                                                                ) : (
                                                                    <button className="button button-outline button-small" disabled>
                                                                        <Icon name="check" style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                                                        Gebucht
                                                                    </button>
                                                                )
                                                            ) : (
                                                                // Wenn nicht gebucht
                                                                isFull ? (
                                                                    <button
                                                                        className="button button-primary button-small"
                                                                        onClick={(e) => { e.stopPropagation(); handleAction('book', event); }}
                                                                    >
                                                                        Auf die Warteliste
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="button button-primary button-small"
                                                                        onClick={(e) => { e.stopPropagation(); handleAction('book', event); }}
                                                                    >
                                                                        Anmelden
                                                                    </button>
                                                                )
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
                    bookingStatus={myBookings.get(selectedEvent.id)}
                    onNotify={() => handleNotifyParticipants(selectedEvent)}
                />
            )}
        </div>
    );
}