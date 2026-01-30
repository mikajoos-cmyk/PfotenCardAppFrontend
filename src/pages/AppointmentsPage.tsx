import React, { useEffect, useState, useMemo } from 'react';
import { apiClient, Appointment, Booking } from '../lib/api';
import { User, View, AppStatus, ColorRule } from '../types';
import { hasPermission } from '../lib/permissions';
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
const getCategoryColor = (event: Appointment, workshopLectureColor?: string, colorRules?: ColorRule[]): string => {
    // 1. NEU: Dynamische Farbregeln (Höchste Priorität)
    if (colorRules && colorRules.length > 0) {
        // Erst nach spezifischen Leistungs-Regeln suchen
        const serviceRule = colorRules.find(r => r.type === 'service' && r.target_ids.includes(event.training_type_id || -1));
        if (serviceRule) return serviceRule.color;

        // Dann nach Level-Regeln suchen
        if (event.target_levels && event.target_levels.length > 0) {
            const levelIds = event.target_levels.map((l: any) => l.id);
            const levelRule = colorRules.find(r => r.type === 'level' && r.target_ids.some(id => levelIds.includes(id)));
            if (levelRule) return levelRule.color;
        }
    }

    // 2. Kategorie-basierte Farben (Workshop/Vortrag)
    if (event.training_type) {
        if (event.training_type.category === 'workshop' || event.training_type.category === 'lecture') {
            return workshopLectureColor || '#F97316';
        }
    }

    // 3. Fallback auf Keywords
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

const AppointmentModal = ({ isOpen, onClose, onSave, allLevels, staffUsers, allServices, initialData, showLeistung, defaultDuration, defaultMaxParticipants }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void, allLevels: any[], staffUsers: any[], allServices: any[], initialData?: Appointment | null, showLeistung?: boolean, defaultDuration: number, defaultMaxParticipants: number }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        duration: defaultDuration,
        location: '',
        max_participants: defaultMaxParticipants,
        trainer_id: '',
        training_type_id: '',
        target_level_ids: [] as number[],
        price: null as number | null, // NEU
        is_open_for_all: false,
        is_recurring: false,
        recurrence_pattern: 'weekly',
        end_after_count: 4,
        end_at_date: ''
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
                training_type_id: initialData.training_type_id?.toString() || '',
                target_level_ids: (initialData.target_levels && initialData.target_levels.length > 0)
                    ? initialData.target_levels.map((l: any) => l.id)
                    : (initialData.target_level_ids || []),
                price: initialData.price || null, // NEU
                is_open_for_all: initialData.is_open_for_all || false,
                is_recurring: false,
                recurrence_pattern: 'weekly',
                end_after_count: 4,
                end_at_date: ''
            });
        } else {
            setFormData({
                title: '',
                description: '',
                date: '',
                start_time: '',
                end_time: '',
                duration: defaultDuration,
                location: '',
                max_participants: defaultMaxParticipants,
                trainer_id: '',
                training_type_id: '',
                target_level_ids: [],
                price: null, // NEU
                is_open_for_all: false,
                is_recurring: false,
                recurrence_pattern: 'weekly',
                end_after_count: 4,
                end_at_date: ''
            });
        }
    }, [initialData, isOpen, defaultDuration, defaultMaxParticipants]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validierung: Wenn Dropdown für Leistung sichtbar ist (Automatisierung aktiv), muss eine gewählt sein.
        if (showLeistung && !formData.training_type_id) {
            alert("Bitte wählen Sie eine Leistung aus (erforderlich für die aktive Automatisierung).");
            return;
        }

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
            training_type_id: formData.training_type_id ? Number(formData.training_type_id) : null,
            price: formData.price ? Number(formData.price) : null, // NEU
            target_level_ids: formData.target_level_ids,
            ...(formData.is_recurring && !initialData ? {
                recurrence_pattern: formData.recurrence_pattern,
                end_after_count: formData.end_after_count,
                end_at_date: formData.end_at_date ? new Date(formData.end_at_date).toISOString() : null
            } : {})
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


                        {showLeistung && (
                            <div className="form-group-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ flex: 3 }}>
                                    <label>Leistung (für Abrechnung & Fortschritt)</label>
                                    <select className="form-input" value={formData.training_type_id} onChange={e => setFormData({ ...formData, training_type_id: e.target.value })}>
                                        <option value="">Leistung wählen...</option>
                                        {allServices.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.default_price}€)</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label>Indiv. Preis (€)</label>
                                    <input
                                        type="number"
                                        step="0.50"
                                        className="form-input"
                                        placeholder="Standard"
                                        value={formData.price || ''}
                                        onChange={e => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : null })}
                                    />
                                </div>
                            </div>
                        )}

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

                        {!initialData && (
                            <>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                                    <label style={{ margin: 0 }}>Wiederkehrender Termin</label>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_recurring}
                                            onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                {formData.is_recurring && (
                                    <div style={{ padding: '1rem', background: 'var(--bg-accent)', borderRadius: '8px', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label>Rhythmus</label>
                                            <select className="form-input" value={formData.recurrence_pattern} onChange={e => setFormData({ ...formData, recurrence_pattern: e.target.value })}>
                                                <option value="daily">Täglich</option>
                                                <option value="weekly">Wöchentlich</option>
                                                <option value="biweekly">Alle 2 Wochen</option>
                                                <option value="weekdays">Wochentage (Mo-Fr)</option>
                                            </select>
                                        </div>
                                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label>Anzahl Termine</label>
                                                <input type="number" className="form-input" value={formData.end_after_count} onChange={e => setFormData({ ...formData, end_after_count: parseInt(e.target.value) || 0, end_at_date: '' })} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label>Oder bis Datum</label>
                                                <input type="date" className="form-input" style={{ colorScheme: 'dark' }} value={formData.end_at_date} onChange={e => setFormData({ ...formData, end_at_date: e.target.value, end_after_count: 0 })} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

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
const EventDetailsModal = ({ event, onClose, onAction, user, userRole, isBooked, bookingStatus, onNotify, dogs, selectedDogId, onDogChange, workshopLectureColor, colorRules }: {
    event: Appointment,
    onClose: () => void,
    onAction: (type: 'book' | 'cancel' | 'participants') => void,
    user: any,
    userRole: string,
    isBooked: boolean,
    bookingStatus?: string,
    onNotify: () => void,
    dogs: any[],
    selectedDogId: number | null,
    onDogChange: (id: number | null) => void,
    workshopLectureColor: string,
    colorRules?: ColorRule[]
}) => {
    if (!event) return null;
    const isFull = (event.participants_count || 0) >= event.max_participants;
    const isPast = new Date(event.start_time) < new Date();
    const date = new Date(event.start_time);

    // Header Farbe basierend auf Event-Titel oder Level-Farbe
    const levelColor = getCategoryColor(event, workshopLectureColor, colorRules);
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
                    {event.training_type && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                <Icon name="activity" style={{ color: 'var(--brand-orange)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--brand-orange)' }}>Leistung: {event.training_type.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-accent-success)', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                                <Icon name="dollar" width={16} height={16} style={{ color: 'var(--brand-green)' }} />
                                <span style={{ fontWeight: 700, color: 'var(--brand-green)', fontSize: '1rem' }}>
                                    {event.price ?? event.training_type.default_price}€
                                </span>
                            </div>
                        </div>
                    )}
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

                    {/* Hund-Auswahl für Kunden vor der Buchung */}
                    {!isBooked && !isPast && (userRole === 'customer' || userRole === 'kunde') && dogs.length > 0 && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-accent)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                Für welchen Hund möchtest du buchen?
                            </label>
                            <select
                                className="form-input"
                                value={selectedDogId || ''}
                                onChange={(e) => onDogChange(e.target.value ? Number(e.target.value) : null)}
                                style={{ width: '100%', background: 'var(--card-background)' }}
                            >
                                <option value="">-- Bitte Hund auswählen --</option>
                                {dogs.map(dog => (
                                    <option key={dog.id} value={dog.id}>{dog.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
                            {hasPermission(user, 'can_create_messages') && (
                                <button className="button button-outline" onClick={onNotify} title="Teilnehmer benachrichtigen">
                                    <Icon name="bell" />
                                </button>
                            )}
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
                                disabled={isPast || (!isBooked && (userRole === 'customer' || userRole === 'kunde') && dogs.length > 0 && !selectedDogId)}
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

const ParticipantsModal = ({ isOpen, onClose, bookings, title, onToggleAttendance, onBillParticipant, onBillAll, showBilling, showProgress, loggedInUser }: {
    isOpen: boolean,
    onClose: () => void,
    bookings: Booking[],
    title: string,
    onToggleAttendance: (id: number) => void,
    onBillParticipant?: (id: number) => void,
    onBillAll?: () => void,
    showBilling?: boolean,
    showProgress?: boolean,
    loggedInUser: any
}) => {
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

                {activeTab === 'confirmed' && confirmedList.length > 0 && (showBilling || showProgress) && onBillAll && (
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        {confirmedList.some(b => !b.is_billed) ? (
                            <button onClick={onBillAll} className="button button-primary button-small">
                                <Icon name={showBilling ? "dollar" : "check-circle"} />
                                {showBilling && showProgress
                                    ? ` ${confirmedList.filter(b => !b.is_billed).length} Abrechnen & Fortschritt`
                                    : showBilling
                                        ? ` ${confirmedList.filter(b => !b.is_billed).length} Abrechnen`
                                        : ` ${confirmedList.filter(b => !b.is_billed).length} Fortschritte erteilen`}
                            </button>
                        ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--brand-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Icon name="check-circle" /> Alle abgerechnet
                            </span>
                        )}
                    </div>
                )}

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
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.5rem' }}>
                                                <div style={{ fontWeight: 600 }}>{b.user?.name || 'Unbekannt'}</div>
                                                {b.dog && (
                                                    <div className="participant-dog-name" style={{ fontSize: '0.85rem', color: 'var(--brand-blue)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                                                        <Icon name="paw" width={12} height={12} />
                                                        {b.dog.name}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>
                                                    {activeTab === 'waitlist'
                                                        ? `Wartet seit: ${new Date(b.created_at).toLocaleDateString()}`
                                                        : (b.status === 'confirmed' ? 'Bestätigt' : 'Storniert')}
                                                </span>
                                                {b.is_billed && (
                                                    <span style={{ color: 'var(--brand-green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                        &bull; Abgerechnet
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {activeTab === 'confirmed' && b.status === 'confirmed' && showBilling && onBillParticipant && !b.is_billed && hasPermission(loggedInUser, 'can_edit_status') && (
                                            <button
                                                onClick={() => onBillParticipant(b.id)}
                                                className="button button-outline button-small"
                                                title="Abrechnen"
                                            >
                                                <Icon name="dollar" />
                                            </button>
                                        )}
                                        {activeTab === 'confirmed' && b.status === 'confirmed' && (
                                            <button
                                                onClick={() => onToggleAttendance(b.id)}
                                                className={`button button-small ${b.attended ? 'button-primary' : 'button-outline'}`}
                                                disabled={!hasPermission(loggedInUser, 'can_edit_status')}
                                            >
                                                {b.attended ? <><Icon name="check" /> Anwesend</> : 'Abstempeln'}
                                            </button>
                                        )}
                                    </div>
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

export default function AppointmentsPage({ user, token, setView, appStatus, onUpdateStatus, activeModules }: {
    user: User | any,
    token: string | null,
    setView?: (view: View) => void,
    appStatus?: AppStatus | null,
    onUpdateStatus?: (status: any, message: string) => void,
    activeModules?: string[]
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
    const [allServices, setAllServices] = useState<any[]>([]);

    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [currentParticipants, setCurrentParticipants] = useState<Booking[]>([]);
    const [currentApptTitle, setCurrentApptTitle] = useState('');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    // Detail Modal State
    const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
    const [userDogs, setUserDogs] = useState<any[]>([]);
    const [selectedDogId, setSelectedDogId] = useState<number | null>(null);

    useEffect(() => {
        if (user && user.dogs) {
            setUserDogs(user.dogs);
            // FIX: Nicht mehr automatisch den ersten Hund wählen, Auswahl soll erzwungen werden
            setSelectedDogId(null);
        }
    }, [user]);

    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
    // NEU: Sub-Filter für "Meine Buchungen" (Zukunft / Vergangenheit)
    const [bookingTimeFilter, setBookingTimeFilter] = useState<'future' | 'past'>('future');
    const [openForAllColor, setOpenForAllColor] = useState('#10b981');
    const [workshopLectureColor, setWorkshopLectureColor] = useState('#F97316');
    const [autoBillingEnabled, setAutoBillingEnabled] = useState(false);
    const [autoProgressEnabled, setAutoProgressEnabled] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState(60);
    const [defaultMaxParticipants, setDefaultMaxParticipants] = useState(10);
    const [colorRules, setColorRules] = useState<ColorRule[]>([]);


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
            if (config && config.training_types) {
                setAllServices(config.training_types);
            }
            if (config && config.tenant && config.tenant.config) {
                const tc = config.tenant.config;
                console.log("Tenant Config:", tc);
                setAutoBillingEnabled(!!tc.auto_billing_enabled);
                setAutoProgressEnabled(!!tc.auto_progress_enabled);

                if (tc.branding) {
                    setOpenForAllColor(tc.branding.open_for_all_color || '#10b981');
                    setWorkshopLectureColor(tc.branding.workshop_lecture_color || '#F97316');
                }
                if (tc.appointments) {
                    console.log("Loading default appointment values:", tc.appointments);
                    setDefaultDuration(tc.appointments.default_duration || 60);
                    setDefaultMaxParticipants(tc.appointments.max_participants || 10);
                    setColorRules(tc.appointments.color_rules || []);
                }
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
            } else if (data.recurrence_pattern) {
                await apiClient.createRecurringAppointments(data, token);
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
                const response = await apiClient.bookAppointment(event.id, token, selectedDogId || undefined);
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

    const handleBillParticipant = async (bookingId: number) => {
        if (!confirm("Guthaben für diesen Termin jetzt abziehen?")) return;
        try {
            await apiClient.billBooking(bookingId, token);
            alert("Abrechnung erfolgreich.");
            loadData();
        } catch (e: any) {
            alert(e.message || "Fehler bei der Abrechnung");
        }
    };

    const handleBillAllParticipants = async () => {
        if (!currentParticipants.some(b => b.status === 'confirmed')) {
            alert("Keine bestätigten Teilnehmer zum Abrechnen.");
            return;
        }
        if (!confirm(`Möchtest du wirklich alle ${currentParticipants.filter(b => b.status === 'confirmed').length} Teilnehmer gleichzeitig abrechnen?`)) return;

        const apptId = currentParticipants[0]?.appointment_id;
        if (!apptId) return;

        try {
            let results: any[];
            if (autoBillingEnabled) {
                // billAllParticipants handles both billing AND progress on backend
                results = await apiClient.billAllParticipants(apptId, token);
            } else {
                results = await apiClient.grantAllParticipants(apptId, token);
            }

            const successCount = results.filter((r: any) => r.status === 'success').length;
            const errors = results.filter((r: any) => r.status === 'error');
            const errorCount = errors.length;

            let msg = `${successCount} Teilnehmer erfolgreich verarbeitet.`;
            if (errorCount > 0) {
                msg += `\n\nFehler bei ${errorCount} Teilnehmer(n):`;
                // Zeige die ersten paar Fehlermeldungen an
                errors.slice(0, 5).forEach((err: any) => {
                    // Falls der User im Resultat enthalten ist (Backend müsste das ggf. mitsenden oder wir suchen in currentParticipants)
                    const participant = currentParticipants.find(p => p.id === err.booking_id);
                    const name = participant?.user?.name || `ID ${err.booking_id}`;
                    msg += `\n• ${name}: ${err.detail || 'Unbekannter Fehler'}`;
                });
                if (errorCount > 5) {
                    msg += `\n... und ${errorCount - 5} weitere.`;
                }
            }
            alert(msg);
            loadData();
        } catch (e: any) {
            alert(e.message || "Fehler bei der Sammel-Aktion");
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
                    // 1. Rollen-basierte Filterung
                    const isStaff = user?.role === 'admin' || user?.role === 'mitarbeiter';
                    if (isStaff) {
                        // Für Mitarbeiter: Kurse anzeigen, bei denen sie Trainer sind
                        if (a.trainer_id !== user?.id) return false;
                    } else {
                        // Für Kunden: Nur gebuchte Termine
                        if (!myBookings.has(a.id)) return false;
                    }

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

                {(user?.role === 'admin' || user?.role === 'mitarbeiter') && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {(user?.role === 'admin' || hasPermission(user, 'can_edit_status')) && activeModules?.includes('status_display') && (
                            <button className="button button-outline" onClick={() => setIsStatusModalOpen(true)}>
                                <Icon name="activity" style={{ marginRight: '0.5rem' }} /> Globalen Status
                            </button>
                        )}

                        {hasPermission(user, 'can_create_courses') && (
                            <button className="button button-primary" onClick={() => setIsCreateOpen(true)}>
                                <Icon name="plus" /> <span className="hidden-mobile">Termin erstellen</span>
                            </button>
                        )}
                    </div>
                )}
            </header>

            {activeModules?.includes('status_display') && (
                <LiveStatusBanner statusData={appStatus || null} />
            )}

            {/* Color Legend */}
            <div className="color-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ display: 'block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: openForAllColor }}></span>
                    <span>Alle Level</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ display: 'block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: workshopLectureColor }}></span>
                    <span>Workshops & Vorträge</span>
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
                    {(user?.role === 'admin' || user?.role === 'mitarbeiter') ? 'Meine Kurse' : 'Meine Buchungen'}
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
                                        const eventColor = getCategoryColor(event, workshopLectureColor, colorRules);
                                        let barColors = [eventColor];

                                        if (event.is_open_for_all) {
                                            barColors = [openForAllColor];
                                        } else if (eventColor === 'gold' && targetLevels.length > 0) {
                                            // Fallback auf Level-Farben falls keine spezifische Regel greift
                                            barColors = targetLevels.map((l: any) => l.color || 'gold');
                                        }

                                        const levelColor = targetLevels.length > 0 ? targetLevels[0].color : 'gold';

                                        return (
                                            <li
                                                key={event.id}
                                                className="event-item-styled"
                                                onClick={() => { setSelectedEvent(event); setSelectedDogId(null); }}
                                                style={{ position: 'relative', overflow: 'hidden' }}
                                            >
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
                                                <div className="event-details" style={{ paddingLeft: '1.25rem' }}>
                                                    <span className="event-title">{event.title}</span>
                                                    <div className="event-line-2">
                                                        <span>{formatDate(date)} &bull; {formatTime(date)}</span>
                                                        {event.location && <span className="event-location">&bull; {event.location}</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                                        {event.training_type && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--brand-orange)', background: 'var(--bg-accent-orange)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--warning-color-light)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                                <Icon name="activity" style={{ width: '10px', height: '10px' }} />
                                                                {event.training_type.name}
                                                            </div>
                                                        )}
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
                                                        {hasPermission(user, 'can_create_messages') && (
                                                            <button
                                                                className="button button-outline button-small notify-bell-btn"
                                                                onClick={(e) => { e.stopPropagation(); handleNotifyParticipants(event); }}
                                                                title="Teilnehmer benachrichtigen"
                                                            >
                                                                <Icon name="bell" />
                                                            </button>
                                                        )}
                                                        {hasPermission(user, 'can_create_courses') && (
                                                            <>
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
                                                            </>
                                                        )}
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
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setSelectedDogId(null); }}
                                                                    >
                                                                        Auf die Warteliste
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="button button-primary button-small"
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setSelectedDogId(null); }}
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

            {isCreateOpen && (
                <AppointmentModal
                    isOpen={isCreateOpen}
                    onClose={() => { setIsCreateOpen(false); setEditingEvent(null); }}
                    onSave={handleSave}
                    allLevels={allLevels}
                    staffUsers={staffUsers}
                    allServices={allServices}
                    initialData={editingEvent}
                    showLeistung={autoBillingEnabled || autoProgressEnabled} // Nur anzeigen wenn einer der beiden an ist
                    defaultDuration={defaultDuration}
                    defaultMaxParticipants={defaultMaxParticipants}
                />
            )}
            <ParticipantsModal
                isOpen={participantsOpen}
                onClose={() => setParticipantsOpen(false)}
                bookings={currentParticipants}
                title={currentApptTitle}
                onToggleAttendance={handleToggleAttendance}
                onBillParticipant={handleBillParticipant}
                onBillAll={handleBillAllParticipants}
                showBilling={autoBillingEnabled || autoProgressEnabled}
                showProgress={autoProgressEnabled}
                loggedInUser={user}
            />

            {selectedEvent && (
                <EventDetailsModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onAction={(type) => handleAction(type, selectedEvent)}
                    user={user}
                    userRole={user.role}
                    isBooked={myBookings.has(selectedEvent.id)}
                    bookingStatus={myBookings.get(selectedEvent.id)}
                    onNotify={() => handleNotifyParticipants(selectedEvent)}
                    dogs={userDogs}
                    selectedDogId={selectedDogId}
                    onDogChange={setSelectedDogId}
                    workshopLectureColor={workshopLectureColor}
                    colorRules={colorRules}
                />
            )}
        </div>
    );
}