import React, { useEffect, useState, useMemo } from 'react';
import { apiClient, Appointment, Booking } from '../lib/api';
import { User, View, AppStatus } from '../types';
import LiveStatusBanner from '../components/ui/LiveStatusBanner';
import LiveStatusModal from '../components/modals/LiveStatusModal';
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
// Farben basierend auf Level oder Keywords
const getCategoryColor = (event: Appointment): string => {
    // 1. Wenn Level-Farbe vorhanden ist, nimm die erste
    if (event.target_levels && event.target_levels.length > 0) {
        const firstLevelWithColor = event.target_levels.find(l => l.color);
        if (firstLevelWithColor) return firstLevelWithColor.color;
    }

    // 2. Fallback auf Keywords
    const t = (event.title || "").toLowerCase();
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

const AppointmentModal = ({ isOpen, onClose, onSave, allLevels, staffUsers, initialData }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void, allLevels: any[], staffUsers: any[], initialData?: Appointment | null }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        duration: 60,
        location: '',
        max_participants: 10,
        trainer_id: '',
        target_level_ids: [] as number[],
        is_open_for_all: false
    });

    // Helper to calc end time
    const calculateEndTime = (start: string, duration: number) => {
        if (!start) return '';
        try {
            const [h, m] = start.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m + duration);
            return date.toTimeString().slice(0, 5); // HH:MM
        } catch (e) { return ''; }
    };

    useEffect(() => {
        if (initialData) {
            const start = new Date(initialData.start_time);
            const end = new Date(initialData.end_time);
            const dur = Math.round((end.getTime() - start.getTime()) / 60000);

            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                date: start.toISOString().split('T')[0],
                start_time: start.toTimeString().slice(0, 5),
                end_time: end.toTimeString().slice(0, 5),
                duration: dur,
                location: initialData.location || '',
                max_participants: initialData.max_participants || 10,
                trainer_id: initialData.trainer_id?.toString() || '',
                target_level_ids: (initialData.target_levels && initialData.target_levels.length > 0)
                    ? initialData.target_levels.map((l: any) => l.id)
                    : (initialData.target_level_ids || []),
                is_open_for_all: initialData.is_open_for_all || false
            });
        } else {
            setFormData({
                title: '',
                description: '',
                date: '',
                start_time: '',
                end_time: '',
                duration: 60,
                location: '',
                max_participants: 10,
                trainer_id: '',
                target_level_ids: [],
                is_open_for_all: false
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const start = new Date(`${formData.date}T${formData.start_time}`);
        const end = new Date(`${formData.date}T${formData.end_time}`);
        onSave({
            title: formData.title,
            description: formData.description,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            is_open_for_all: formData.is_open_for_all,
            location: formData.location,
            max_participants: Number(formData.max_participants),
            trainer_id: formData.trainer_id ? Number(formData.trainer_id) : null,
            target_level_ids: formData.target_level_ids
        });
    };

    const toggleLevel = (id: number) => {
        setFormData(prev => ({
            ...prev,
            target_level_ids: prev.target_level_ids.includes(id)
                ? prev.target_level_ids.filter(l => l !== id)
                : [...prev.target_level_ids, id]
        }));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header blue">
                    <h2>{initialData ? 'Termin bearbeiten' : 'Neuen Termin erstellen'}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="form-grid-single">
                        <div className="form-group"><label>Titel</label><input required className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="z.B. Welpen-Spielstunde" /></div>


                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}><label>Datum</label><input type="date" required className="form-input" style={{ colorScheme: 'dark' }} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            <div style={{ flex: 1 }}><label>Max. Teilnehmer</label><input type="number" required className="form-input" value={formData.max_participants} onChange={e => setFormData({ ...formData, max_participants: parseInt(e.target.value) })} /></div>
                        </div>

                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label>Startzeit</label>
                                <input
                                    type="time"
                                    required
                                    className="form-input"
                                    style={{ colorScheme: 'dark' }}
                                    value={formData.start_time}
                                    onChange={e => {
                                        const newStart = e.target.value;
                                        const newEnd = calculateEndTime(newStart, formData.duration);
                                        setFormData({ ...formData, start_time: newStart, end_time: newEnd });
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Dauer (Min)</label>
                                <input
                                    type="number"
                                    required
                                    className="form-input"
                                    value={formData.duration}
                                    onChange={e => {
                                        const newDur = parseInt(e.target.value) || 0;
                                        const newEnd = calculateEndTime(formData.start_time, newDur);
                                        setFormData({ ...formData, duration: newDur, end_time: newEnd });
                                    }}
                                />
                            </div>
                        </div>


                        <div className="form-group">
                            <label>Trainer</label>
                            <select className="form-input" value={formData.trainer_id} onChange={e => setFormData({ ...formData, trainer_id: e.target.value })}>
                                <option value="">Bitte auswählen...</option>
                                {staffUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                            <label style={{ margin: 0 }}>Alle dürfen kommen (Level-System deaktivieren)</label>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={formData.is_open_for_all}
                                    onChange={e => setFormData({ ...formData, is_open_for_all: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        {!formData.is_open_for_all && (
                            <div className="form-group">
                                <label>Für Level (Mehrfachauswahl)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    {allLevels.map(lvl => (
                                        <button
                                            key={lvl.id}
                                            type="button"
                                            onClick={() => toggleLevel(lvl.id)}
                                            className={`button button-small ${formData.target_level_ids.includes(lvl.id) ? 'button-primary' : 'button-outline'}`}
                                            style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
                                        >
                                            {lvl.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group"><label>Ort</label><input className="form-input" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Hundeplatz / Online" /></div>
                        <div className="form-group"><label>Beschreibung</label><textarea className="form-input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." /></div>

                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="button button-outline">Abbrechen</button>
                            <button type="submit" className="button button-primary">{initialData ? 'Speichern' : 'Erstellen'}</button>
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

    // Header Farbe basierend auf Event-Titel oder Level-Farbe
    const levelColor = getCategoryColor(event);
    const headerColorClass = levelColor === 'orchid' ? 'purple'
        : levelColor === 'tomato' ? 'red'
            : 'blue';

    const headerStyle = !['purple', 'red', 'blue'].includes(headerColorClass)
        ? { backgroundColor: levelColor }
        : {};

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`modal-header ${headerColorClass}`} style={headerStyle}>
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
                    <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                        {event.description || 'Keine weitere Beschreibung verfügbar.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Trainer</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="initials-avatar small avatar-gray" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                                    {event.trainer?.name?.charAt(0) || '?'}
                                </div>
                                <span style={{ fontSize: '0.9rem' }}>{event.trainer?.name || 'Kein Trainer zugewiesen'}</span>
                            </div>
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.25rem' }}>Zielgruppe</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {event.is_open_for_all ? (
                                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.6rem', borderRadius: '12px', background: 'var(--bg-accent-success)', color: 'var(--brand-green)', fontWeight: 600, border: '1px solid var(--success-color-light)' }}>
                                        Alle dürfen kommen
                                    </span>
                                ) : event.target_levels && event.target_levels.length > 0 ? (
                                    event.target_levels.map((lvl: any) => (
                                        <span key={lvl.id} style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--bg-accent)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                            {lvl.name}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Alle Level</span>
                                )}
                            </div>
                        </div>
                    </div>
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
                <div className="segmented-tabs">
                    <button
                        onClick={() => setActiveTab('confirmed')}
                        className={`segmented-tab-btn ${activeTab === 'confirmed' ? 'active' : ''}`}
                    >
                        Teilnehmer <span className="tab-badge">{confirmedList.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        className={`segmented-tab-btn ${activeTab === 'waitlist' ? 'active' : ''}`}
                    >
                        Warteliste <span className="tab-badge">{waitlistList.length}</span>
                    </button>
                </div>

                <div className="tab-content-container" key={activeTab}>
                    {currentList.length === 0 ? <p className="text-gray-500 italic">Keine Einträge in dieser Liste.</p> : (
                        <ul className="active-customer-list">
                            {/* ... list items ... */}
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
            </div>
        </InfoModal>
    );
};

// --- MAIN PAGE ---

export default function AppointmentsPage({ user, token, setView, appStatus, onUpdateStatus }: {
    user: User | any,
    token: string | null,
    setView?: (view: View) => void,
    appStatus?: AppStatus | null,
    onUpdateStatus?: (status: any, message: string) => void
}) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    // ÄNDERUNG: Status statt nur ID speichern (Map<ID, Status>)
    const [myBookings, setMyBookings] = useState<Map<number, string>>(new Map());
    const isPreview = !token || token === 'preview-token';

    // Admin State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Appointment | null>(null);
    const [staffUsers, setStaffUsers] = useState<any[]>([]);
    const [allLevels, setAllLevels] = useState<any[]>([]);

    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [currentParticipants, setCurrentParticipants] = useState<Booking[]>([]);
    const [currentApptTitle, setCurrentApptTitle] = useState('');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    // Detail Modal State
    const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);

    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
    // NEU: Sub-Filter für "Meine Buchungen" (Zukunft / Vergangenheit)
    const [bookingTimeFilter, setBookingTimeFilter] = useState<'future' | 'past'>('future');
    const [openForAllColor, setOpenForAllColor] = useState('#10b981');


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
            const [appts, bookings, staff, config] = await Promise.all([
                apiClient.getAppointments(token),
                apiClient.getMyBookings(token).catch(e => {
                    console.warn("Could not fetch user bookings:", e);
                    return [];
                }),
                apiClient.getStaff(token).catch(() => []),
                apiClient.getConfig().catch(() => null)
            ]);
            console.log("Loaded Appointments:", appts);
            console.log("Loaded Staff:", staff);
            setAppointments(appts);
            setStaffUsers(staff);
            if (config && config.levels) {
                setAllLevels(config.levels);
            }
            if (config && config.tenant && config.tenant.config && config.tenant.config.branding) {
                setOpenForAllColor(config.tenant.config.branding.open_for_all_color || '#10b981');
            }
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

    const handleSave = async (data: any) => {
        if (isPreview) {
            if (editingEvent) {
                setAppointments(appointments.map(a => a.id === editingEvent.id ? { ...a, ...data } : a));
            } else {
                const newAppt = { ...data, id: Date.now(), participants_count: 0 };
                setAppointments([...appointments, newAppt]);
            }
            setIsCreateOpen(false);
            setEditingEvent(null);
            return;
        }

        try {
            console.log("Saving Appointment Data:", data);
            if (editingEvent) {
                await apiClient.updateAppointment(editingEvent.id, data, token);
            } else {
                await apiClient.createAppointment(data, token);
            }
            setIsCreateOpen(false);
            setEditingEvent(null);
            loadData();
        } catch (e) {
            alert("Fehler beim Speichern");
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

    const handleDelete = async (appointmentId: number) => {
        if (!confirm("Möchten Sie diesen Termin wirklich unwiderruflich löschen? Alle Buchungen dazu werden ebenfalls gelöscht.")) {
            return;
        }

        if (isPreview) {
            setAppointments(appointments.filter(a => a.id !== appointmentId));
            return;
        }

        try {
            await apiClient.delete(`/api/appointments/${appointmentId}`, token);
            loadData();
        } catch (e) {
            alert("Fehler beim Löschen des Termins");
        }
    };

    // --- GROUPING LOGIC ---
    const eventsByWeek = useMemo(() => {
        const now = new Date();
        // Zeige auch Events von heute an (Hours 0 setzten)
        const displayStart = new Date(now.setHours(0, 0, 0, 0));

        let filtered = appointments
            .filter(a => {
                const nowTime = now.getTime();
                const eventTime = new Date(a.start_time).getTime();
                // "Heute" beginnt um 00:00 - alles davor ist Vergangenheit (historisch für heute relevant? 
                // Meistens will man ab "jetzt" oder ab "heute morgen" sehen.
                // Logik für "Zukunft" = Ab heute (displayStart).
                // Logik für "Vergangenheit" = Vor heute (displayStart).

                const isFutureOrToday = eventTime >= displayStart.getTime();

                if (activeTab === 'mine') {
                    // 1. Muss gebucht sein
                    if (!myBookings.has(a.id)) return false;

                    // 2. Zeitfilter beachten
                    if (bookingTimeFilter === 'future') {
                        return isFutureOrToday;
                    } else {
                        // Vergangenheit
                        return !isFutureOrToday;
                    }
                }

                // Tab "Alle": Nur Zukunft/Heute anzeigen (Standardverhalten)
                return isFutureOrToday;
            });

        const sortedEvents = filtered.sort((a, b) => {
            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();

            // Bei Vergangenheit: Neueste zuerst (damit man nicht scrollen muss für das letzte Event)
            if (activeTab === 'mine' && bookingTimeFilter === 'past') {
                return timeB - timeA;
            }
            // Sonst (Zukunft): Nächste Events zuerst
            return timeA - timeB;
        });

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

        sortedEvents.forEach(event => {
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
    }, [appointments, activeTab, bookingTimeFilter, myBookings]);

    return (
        <div className="appointments-page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Termine & Events</h1>
                    <p>Finde den passenden Kurs für dich und deinen Hund.</p>
                </div>

                {user?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="button button-outline" onClick={() => setIsStatusModalOpen(true)}>
                            <Icon name="activity" style={{ marginRight: '0.5rem' }} /> Globalen Status
                        </button>

                        <button className="button button-primary" onClick={() => setIsCreateOpen(true)}>
                            <Icon name="plus" /> <span className="hidden-mobile">Termin erstellen</span>
                        </button>
                    </div>
                )}
            </header>

            <LiveStatusBanner statusData={appStatus || null} />

            {/* Color Legend */}
            <div className="color-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ display: 'block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: openForAllColor }}></span>
                    <span>Alle Level</span>
                </div>
                {allLevels.map(lvl => (
                    <div key={lvl.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ display: 'block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: lvl.color || 'gold' }}></span>
                        <span>{lvl.name}</span>
                    </div>
                ))}
            </div>

            <div className="segmented-tabs" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`segmented-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                >
                    Alle Termine
                </button>
                <button
                    onClick={() => setActiveTab('mine')}
                    className={`segmented-tab-btn ${activeTab === 'mine' ? 'active' : ''}`}
                >
                    Meine Buchungen
                </button>
            </div>

            {/* Sub-Filter für "Meine Buchungen" */}
            {activeTab === 'mine' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
                    <button
                        className={`button ${bookingTimeFilter === 'future' ? 'button-primary' : 'button-outline'}`}
                        style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                        onClick={() => setBookingTimeFilter('future')}
                    >
                        Aktuell & Kommend
                    </button>
                    <button
                        className={`button ${bookingTimeFilter === 'past' ? 'button-primary' : 'button-outline'}`}
                        style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                        onClick={() => setBookingTimeFilter('past')}
                    >
                        Vergangenheit
                    </button>
                </div>
            )}

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
                                        const free = event.max_participants - (event.participants_count || 0);
                                        const isBooked = myBookings.has(event.id);
                                        const bookingStatus = myBookings.get(event.id); // 'confirmed' oder 'waitlist'

                                        const targetLevels = event.target_levels || [];
                                        let barColors = targetLevels.map((l: any) => l.color || 'gold');
                                        if (event.is_open_for_all) {
                                            barColors = [openForAllColor];
                                        } else if (barColors.length === 0) {
                                            barColors.push('gold');
                                        }

                                        return (
                                            <li
                                                key={event.id}
                                                className="event-item-styled"
                                                style={{ position: 'relative', overflow: 'hidden' }}
                                            >
                                                {/* Neuer Farbbalken links */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    {barColors.map((color: string, i: number) => (
                                                        <div key={i} style={{ flex: 1, backgroundColor: color }} />
                                                    ))}
                                                </div>
                                                {/* Klickbarer Bereich für Details */}
                                                <div className="event-details" style={{ paddingLeft: '1.25rem' }} onClick={() => setSelectedEvent(event)}>
                                                    <span className="event-title">{event.title}</span>
                                                    <div className="event-line-2">
                                                        <span>{formatDate(date)} &bull; {formatTime(date)}</span>
                                                        {event.location && <span className="event-location">&bull; {event.location}</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                                        {event.trainer && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-card)', padding: '0.1rem 0.5rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                                <Icon name="user" style={{ width: '10px', height: '10px' }} />
                                                                {event.trainer.name}
                                                            </div>
                                                        )}
                                                        {event.target_levels?.map((lvl: any) => (
                                                            <div key={lvl.id} style={{ fontSize: '0.7rem', color: 'var(--primary-color)', background: 'var(--bg-accent)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>
                                                                {lvl.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Aktions-Bereich rechts */}
                                                {(user.role === 'admin' || user.role === 'mitarbeiter') && (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button
                                                            className="button button-outline button-small notify-bell-btn"
                                                            onClick={(e) => { e.stopPropagation(); handleNotifyParticipants(event); }}
                                                            title="Teilnehmer benachrichtigen"
                                                        >
                                                            <Icon name="bell" />
                                                        </button>
                                                        <button
                                                            className="button button-outline button-small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingEvent(event);
                                                                setIsCreateOpen(true);
                                                            }}
                                                            title="Bearbeiten"
                                                        >
                                                            <Icon name="edit" />
                                                        </button>
                                                        <button
                                                            className="button button-outline button-small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(event.id);
                                                            }}
                                                            style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                                                            title="Löschen"
                                                        >
                                                            <Icon name="trash" />
                                                        </button>
                                                    </div>
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

            {isStatusModalOpen && onUpdateStatus && (
                <LiveStatusModal
                    currentStatus={appStatus || null}
                    onClose={() => setIsStatusModalOpen(false)}
                    onSave={onUpdateStatus}
                />
            )}

            <AppointmentModal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setEditingEvent(null);
                }}
                onSave={handleSave}
                allLevels={allLevels}
                staffUsers={staffUsers}
                initialData={editingEvent}
            />

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