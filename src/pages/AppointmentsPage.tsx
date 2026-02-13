import React, { useEffect, useState, useMemo } from 'react';
import { apiClient, Appointment, Booking } from '../lib/api';
// NEU: Hilfsfunktion für Block-Kurse
const isBlockEnrolled = (blockId: string, myBookings: Map<number, string>, events: Appointment[]) => {
    // Prüfe, ob IRGENDEIN Event dieses Blocks gebucht ist
    return events.filter(e => e.block_id === blockId).some(e => myBookings.has(e.id) && myBookings.get(e.id) === 'confirmed');
};
import { User, View, AppStatus, ColorRule } from '../types';
import { hasPermission } from '../lib/permissions';
import LiveStatusBanner from '../components/ui/LiveStatusBanner';
import LiveStatusModal from '../components/modals/LiveStatusModal';
import Icon from '../components/ui/Icon';
import InfoModal from '../components/modals/InfoModal';
import { useAppointments } from '../hooks/queries/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../hooks/queries/useConfig';
import { useStaff } from '../hooks/queries/useStaff';
import { useMyBookings } from '../hooks/queries/useMyBookings';

// --- MOCK DATEN FÜR PREVIEW ---
const MOCK_APPOINTMENTS: any[] = [
    { id: 101, title: 'Welpenstunde', description: 'Spiel & Spaß für die Kleinen.', start_time: new Date(Date.now() + 86400000).toISOString(), end_time: new Date(Date.now() + 90000000).toISOString(), location: 'Welpenwiese', max_participants: 8, participants_count: 5 },
    { id: 102, title: 'Level 2 - Grunderziehung', description: 'Sitz, Platz, Bleib unter Ablenkung.', start_time: new Date(Date.now() + 172800000).toISOString(), end_time: new Date(Date.now() + 176400000).toISOString(), location: 'Platz 1', max_participants: 6, participants_count: 2 },
    { id: 103, title: 'Agility Workshop', description: 'Einsteiger-Kurs für sportliche Hunde.', start_time: new Date(Date.now() + 259200000).toISOString(), end_time: new Date(Date.now() + 262800000).toISOString(), location: 'Halle', max_participants: 6, participants_count: 6 },
    { id: 104, title: 'Prüfungs-Vorbereitung', description: 'Intensivtraining für den Hundeführerschein.', start_time: new Date(Date.now() + 345600000).toISOString(), end_time: new Date(Date.now() + 349200000).toISOString(), location: 'Stadtpark', max_participants: 4, participants_count: 4 },
];

// --- HILFSFUNKTIONEN ---
const formatDate = (date: Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
const formatTime = (date: Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
import { getInitials, getAvatarColorClass, getLevelColor } from '../lib/utils';

// Farben basierend auf Keywords
// Farben basierend auf Level oder Keywords
const getCategoryColor = (event: Appointment, colorRules?: ColorRule[]): string => {
    // 1. NEU: Dynamische Farbregeln (Höchste Priorität)
    if (colorRules && colorRules.length > 0) {
        // Erst nach spezifischen Leistungs-Regeln suchen
        const serviceRule = colorRules.find(r => r.type === 'service' && r.target_ids.includes(event.training_type_id || -1));
        if (serviceRule) return serviceRule.color;

        // Dann nach Level-Regeln suchen
        if (event.target_levels && event.target_levels.length > 0) {
            const levelIds = event.target_levels.map((l: any) => l.id);
            const levelRule = colorRules.find(r => {
                if (r.type !== 'level') return false;

                if (r.match_all) {
                    // AND-Logik: Alle IDs der Regel müssen im Event enthalten sein
                    if (r.target_ids.length === 0) return false;
                    return r.target_ids.every(id => levelIds.includes(id));
                } else {
                    // OR-Logik: Eine der IDs reicht
                    return r.target_ids.some(id => levelIds.includes(id));
                }
            });
            if (levelRule) return levelRule.color;
        }
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

const AppointmentModal = ({ isOpen, onClose, onSave, allLevels, staffUsers, allServices, initialData, showLeistung, defaultDuration, defaultMaxParticipants, allAppointments, isDarkMode }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void, allLevels: any[], staffUsers: any[], allServices: any[], initialData?: Appointment | null, showLeistung?: boolean, defaultDuration: number, defaultMaxParticipants: number, allAppointments: Appointment[], isDarkMode?: boolean }) => {
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
        end_at_date: '',
        is_block: false // NEU: Option für geschlossenen Kurs
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
                is_recurring: !!initialData.block_id, // NEU: Wenn Block, dann als wiederkehrend anzeigen
                recurrence_pattern: 'weekly', // Standard, da wir das Pattern nicht im Model speichern (nur als Gruppe)
                end_after_count: allAppointments.filter(a => a.block_id === initialData.block_id).length,
                end_at_date: '',
                is_block: !!initialData.block_id
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
                end_at_date: '',
                is_block: false // NEU: Reset
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
            target_level_ids: formData.is_open_for_all ? allLevels.map(l => l.id) : formData.target_level_ids,
            ...(formData.is_recurring && !initialData ? {
                recurrence_pattern: formData.recurrence_pattern,
                end_after_count: formData.end_after_count,
                end_at_date: formData.end_at_date ? new Date(formData.end_at_date).toISOString() : null,
                is_block: formData.is_block // NEU übertragen
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
                            <div style={{ flex: 1 }}><label>Datum</label><input type="date" required className="form-input" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            <div style={{ flex: 1 }}><label>Max. Teilnehmer</label><input type="number" required className="form-input" value={formData.max_participants} onChange={e => setFormData({ ...formData, max_participants: parseInt(e.target.value) })} /></div>
                        </div>

                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label>Startzeit</label>
                                <input
                                    type="time"
                                    required
                                    className="form-input"
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
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

                        {/* NEU: Wiederkehrer-Logik auch beim Editieren anzeigen, wenn es ein Block-Kurs ist */}
                        {(!initialData || formData.is_block) && (
                            <>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                                    <label style={{ margin: 0 }}>
                                        {initialData ? 'Teil eines Pakets / Kurses' : 'Wiederkehrender Termin'}
                                    </label>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            disabled={!!initialData} // Beim Editieren nicht mehr ausschaltbar, wenn es einmal ein Block ist
                                            checked={formData.is_recurring}
                                            onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                {formData.is_recurring && (
                                    <div style={{ padding: '1rem', background: 'var(--bg-accent)', borderRadius: '8px', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {initialData && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--brand-orange)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                                ⚠️ Achtung: Änderungen an Datum oder Uhrzeit verschieben das GESAMTE Paket proportional.
                                            </div>
                                        )}
                                        {!initialData && (
                                            <div className="form-group">
                                                <label>Rhythmus</label>
                                                <select className="form-input" value={formData.recurrence_pattern} onChange={e => setFormData({ ...formData, recurrence_pattern: e.target.value })}>
                                                    <option value="daily">Täglich</option>
                                                    <option value="weekly">Wöchentlich</option>
                                                    <option value="biweekly">Alle 2 Wochen</option>
                                                    <option value="weekdays">Wochentage (Mo-Fr)</option>
                                                </select>
                                            </div>
                                        )}
                                        <div className="form-group row" style={{ display: 'flex', gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label>Anzahl Termine</label>
                                                <input
                                                    type="number"
                                                    disabled={!!initialData}
                                                    className="form-input"
                                                    value={formData.end_after_count}
                                                    onChange={e => setFormData({ ...formData, end_after_count: parseInt(e.target.value) || 0, end_at_date: '' })}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label>Oder bis Datum</label>
                                                <input
                                                    type="date"
                                                    disabled={!!initialData}
                                                    className="form-input"
                                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                                    value={formData.end_at_date}
                                                    onChange={e => setFormData({ ...formData, end_at_date: e.target.value, end_after_count: 0 })}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                            <label style={{ margin: 0 }}>Als geschlossenen Kurs anlegen?<br /><span style={{ fontSize: '0.8rem', color: '#999' }}>Benutzer buchen alle Termine auf einmal.</span></label>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    disabled={!!initialData}
                                                    checked={formData.is_block}
                                                    onChange={e => setFormData({ ...formData, is_block: e.target.checked })}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* NEU: Anzeige der Termine für Block-Kurse im Editier-Modus */}
                        {initialData && initialData.block_id && allAppointments && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-accent)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Termine in diesem Block:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto' }}>
                                    {allAppointments
                                        .filter(a => a.block_id === initialData.block_id)
                                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                        .map((a, idx) => (
                                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: a.id === initialData.id ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                                                <span style={{ fontWeight: a.id === initialData.id ? 'bold' : 'normal' }}>
                                                    {idx + 1}. {new Date(a.start_time).toLocaleDateString('de-DE')}
                                                </span>
                                                <span>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(a.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="button button-outline">Abbrechen</button>
                            <button type="submit" className="button button-primary">{initialData ? 'Speichern' : 'Erstellen'}</button>
                        </div>
                    </form>
                </div >
            </div >
        </div >
    );
};

// Update: Eigenes Modal-Layout für bessere Button-Positionierung
const EventDetailsModal = ({ event, onClose, onAction, user, userRole, isBooked, bookingStatus, onNotify, dogs, selectedDogId, onDogChange, colorRules, allAppointments, levels }: {
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
    colorRules?: ColorRule[],
    allAppointments: Appointment[],
    levels?: any[]
}) => {
    if (!event) return null;
    const isFull = (event.participants_count || 0) >= event.max_participants;
    const isPast = new Date(event.start_time) < new Date();
    const date = new Date(event.start_time);

    // Header Farbe basierend auf Event-Titel oder Level-Farbe
    const levelColor = getCategoryColor(event, colorRules);
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
                            <Icon name="calendar" />
                            <span style={{ fontWeight: 500 }}>{formatDate(date)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Icon name="clock" />
                            <span style={{ fontWeight: 500 }}>{formatTime(date)}</span>
                        </div>
                    </div>
                    {event.training_type && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                <Icon name="activity" style={{ color: 'var(--brand-orange)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--brand-orange)' }}>Leistung: {event.training_type.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-accent-success)', padding: '0.5rem 1rem', borderRadius: '12px', border: '2px solid var(--brand-green)' }}>
                                <Icon name="euro" width={20} height={20} style={{ color: 'var(--brand-green)' }} />
                                <span style={{ fontWeight: 800, color: 'var(--brand-green)', fontSize: '1.5rem' }}>
                                    {event.price ?? event.training_type.default_price}€
                                </span>
                            </div>
                        </div>
                    )}
                    {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            <Icon name="mapPin" />
                            <span>{event.location}</span>
                        </div>
                    )}

                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.5rem' }}>Beschreibung</h4>
                    <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                        {event.description || 'Keine weitere Beschreibung verfügbar.'}
                    </p>

                    {/* NEU: Block-Kurs Termine anzeigen */}
                    {event.block_id && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Icon name="layers" style={{ width: '14px', height: '14px' }} />
                                Kurstermine
                            </h4>
                            <div style={{ background: 'var(--bg-accent)', borderRadius: '8px', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                    {allAppointments
                                        .filter(a => a.block_id === event.block_id)
                                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                        .map((a, idx) => {
                                            const isThisEvent = a.id === event.id;
                                            const isPastEvent = new Date(a.end_time) < new Date();
                                            return (
                                                <div key={a.id} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    fontSize: '0.9rem',
                                                    opacity: isPastEvent ? 0.6 : 1,
                                                    color: isThisEvent ? 'var(--primary-color)' : 'inherit',
                                                    fontWeight: isThisEvent ? 600 : 400
                                                }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <span style={{ minWidth: '20px', color: 'var(--text-light)' }}>{idx + 1}.</span>
                                                        <span style={{ textDecoration: isPastEvent ? 'line-through' : 'none' }}>
                                                            {formatDate(new Date(a.start_time))}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                        {formatTime(new Date(a.start_time))}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                                {!isBooked && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                                        Mit der Buchung meldest du dich für alle oben genannten Termine an.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                                {(() => {
                                    const trainer = event.trainer;
                                    const firstName = trainer?.name?.split(' ')[0] || '';
                                    const levelId = trainer?.level_id || trainer?.current_level_id;
                                    const levelColor = getLevelColor(levelId, levels);

                                    return (
                                        <div 
                                            className={`initials-avatar small ${!levelColor ? 'avatar-gray' : ''}`} 
                                            style={{ 
                                                width: '24px', 
                                                height: '24px', 
                                                fontSize: '0.7rem',
                                                ...(levelColor ? { backgroundColor: levelColor, color: 'white' } : {})
                                            }}
                                        >
                                            {trainer?.name?.charAt(0) || '?'}
                                        </div>
                                    );
                                })()}
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
                                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.6rem', borderRadius: '12px', background: 'var(--bg-accent-success)', color: 'var(--brand-green)', fontWeight: 600, border: '1px solid var(--success-color-light)' }}>
                                        Alle dürfen kommen
                                    </span>
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

const ParticipantsModal = ({ isOpen, onClose, bookings, title, onToggleAttendance, onBillParticipant, onBillAll, showBilling, showProgress, loggedInUser, isBlockEvent, levels }: {
    isOpen: boolean,
    onClose: () => void,
    bookings: Booking[],
    title: string,
    onToggleAttendance: (id: number) => void,
    onBillParticipant?: (id: number) => Promise<void> | void,
    onBillAll?: () => Promise<void> | void,
    showBilling?: boolean,
    showProgress?: boolean,
    loggedInUser: any,
    isBlockEvent?: boolean,
    levels?: any[]
}) => {
    const [activeTab, setActiveTab] = useState<'confirmed' | 'waitlist'>('confirmed');
    const [locallyBilled, setLocallyBilled] = useState<Set<number>>(new Set());

    const isBilledForUI = (b: Booking) => {
        return isBlockEvent ? locallyBilled.has(b.id) : !!b.is_billed;
    };

    const handleBillOne = async (id: number) => {
        if (onBillParticipant) {
            await onBillParticipant(id);
            if (isBlockEvent) {
                setLocallyBilled(prev => {
                    const next = new Set(prev);
                    next.add(id);
                    return next;
                });
            }
        }
    };

    const handleBillAllLocal = async () => {
        if (onBillAll) {
            await onBillAll();
            if (isBlockEvent) {
                const ids = bookings.filter(b => b.status === 'confirmed').map(b => b.id);
                setLocallyBilled(prev => {
                    const next = new Set(prev);
                    ids.forEach(i => next.add(i));
                    return next;
                });
            }
        }
    };

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
                        {confirmedList.some(b => !isBilledForUI(b)) ? (
                            <button onClick={handleBillAllLocal} className="button button-primary button-small">
                                <Icon name={showBilling ? "euro" : "check-circle"} />
                                {showBilling && showProgress
                                    ? ` ${confirmedList.filter(b => !isBilledForUI(b)).length} Abrechnen & Fortschritt`
                                    : showBilling
                                        ? ` ${confirmedList.filter(b => !isBilledForUI(b)).length} Abrechnen`
                                        : ` ${confirmedList.filter(b => !isBilledForUI(b)).length} Fortschritte erteilen`}
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
                                        {(() => {
                                            const firstName = b.user?.name?.split(' ')[0] || '';
                                            const lastName = b.user?.name?.split(' ').slice(1).join(' ') || '';
                                            const levelId = b.dog?.current_level_id || b.user?.level_id || b.user?.current_level_id;
                                            const levelsToUse = levels || [];
                                            const levelColor = getLevelColor(levelId, levelsToUse);

                                            return (
                                                <div 
                                                    className={`initials-avatar small ${!levelColor ? (b.attended ? 'avatar-green' : 'avatar-gray') : ''}`}
                                                    style={levelColor ? { backgroundColor: levelColor, color: 'white' } : {}}
                                                >
                                                    {getInitials(firstName, lastName) || '?'}
                                                </div>
                                            );
                                        })()}
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
                                                        ? `Wartet seit: ${new Date(b.created_at).toLocaleDateString('de-DE')}`
                                                        : (b.status === 'confirmed' ? 'Bestätigt' : 'Storniert')}
                                                </span>
                                                {isBilledForUI(b) && (
                                                    <span style={{ color: 'var(--brand-green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                                        &bull; Abgerechnet
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {activeTab === 'confirmed' && b.status === 'confirmed' && (
                                            <button
                                                onClick={() => onToggleAttendance(b.id)}
                                                className={`button button-small ${b.attended ? '' : 'button-danger'}`}
                                                style={b.attended ? { backgroundColor: 'var(--brand-green)', color: 'white' } : {}}
                                                disabled={!hasPermission(loggedInUser, 'can_edit_status')}
                                            >
                                                {b.attended ? <><Icon name="check" /> Anwesend</> : 'Nicht anwesend'}
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

export default function AppointmentsPage({ user, token, setView, appStatus, onUpdateStatus, activeModules, isDarkMode }: {
    user: User | any,
    token: string | null,
    setView?: (view: View) => void,
    appStatus?: AppStatus | null,
    onUpdateStatus?: (status: any, message: string) => void,
    activeModules?: string[],
    isDarkMode?: boolean
}) {
    const queryClient = useQueryClient();
    const isPreview = !token || token === 'preview-token';

    // 1. HAUPTDATEN (Termine)
    const { data: appointmentsData, isLoading: apptsLoading } = useAppointments(token);
    const appointments = appointmentsData || [];

    // 2. CONFIG DATEN (Farben, Level, Services)
    const { data: configData } = useConfig();

    // Daten aus der Config extrahieren (mit Fallbacks)
    const allLevels = configData?.levels || [];
    const allServices = configData?.training_types || [];
    const colorRules = configData?.tenant?.config?.appointments?.color_rules || [];
    const defaultDuration = configData?.tenant?.config?.appointments?.default_duration || 60;
    const defaultMaxParticipants = configData?.tenant?.config?.appointments?.max_participants || 10;
    const autoBillingEnabled = !!configData?.tenant?.config?.auto_billing_enabled;
    const autoProgressEnabled = !!configData?.tenant?.config?.auto_progress_enabled;

    // 3. MITARBEITER (Trainer)
    const { data: staffData } = useStaff(token);
    const staffUsers = staffData || [];

    // 4. EIGENE BUCHUNGEN (Status der Buttons)
    const { data: myBookingsData } = useMyBookings(token);

    // Umwandlung in Map für schnellen Zugriff (wie im alten Code)
    const myBookings = useMemo(() => {
        const map = new Map<number, string>();
        if (myBookingsData) {
            myBookingsData.forEach((b: any) => map.set(b.appointment_id, b.status));
        }
        return map;
    }, [myBookingsData]);

    // Loading Status
    const loading = apptsLoading && !isPreview;

    // MOCK DATEN FÜR PREVIEW (optional, falls du das Mocking behalten willst)
    useEffect(() => {
        if (isPreview && appointments.length === 0) {
            queryClient.setQueryData(['appointments', token], MOCK_APPOINTMENTS);
        }
    }, [isPreview, appointments.length, queryClient, token]);

    // --- STATE FÜR MODALS & UI ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Appointment | null>(null);

    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [currentParticipants, setCurrentParticipants] = useState<Booking[]>([]);
    const [currentApptTitle, setCurrentApptTitle] = useState('');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<Appointment | null>(null);

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
    // const [openForAllColor, setOpenForAllColor] = useState('#10b981'); // DEPRECATED
    // const [workshopLectureColor, setWorkshopLectureColor] = useState('#F97316'); // DEPRECATED
    const isPageLoading = loading;

    // --- ACTIONS ---

    const handleSave = async (data: any) => {
        if (isPreview) {
            const current = queryClient.getQueryData<Appointment[]>(['appointments', token]) || [];
            const next = editingEvent
                ? current.map(a => a.id === editingEvent.id ? { ...a, ...data } : a)
                : [...current, { ...data, id: Date.now(), participants_count: 0 }];
            queryClient.setQueryData(['appointments', token], next);
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
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
                const current = queryClient.getQueryData<any[]>(['myBookings', token]) || [];
                const next = [...current.filter((b: any) => b.appointment_id !== event.id), { appointment_id: event.id, status }];
                queryClient.setQueryData(['myBookings', token], next);

                if (status === 'waitlist') {
                    alert("Preview: Du bist auf der Warteliste.");
                } else {
                    alert("Preview: Erfolgreich angemeldet!");
                }
            } else {
                const current = queryClient.getQueryData<any[]>(['myBookings', token]) || [];
                const next = current.filter((b: any) => b.appointment_id !== event.id);
                queryClient.setQueryData(['myBookings', token], next);
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
                } else {
                    alert("Erfolgreich angemeldet!");
                }
            } else {
                const result = await apiClient.cancelAppointment(event.id, token);
                alert("Storniert.");
                if (result.promoted_user_id) {
                    // Info für den Admin (optional, oder nur Console Log)
                    console.log("User wurde nachgerückt:", result.promoted_user_id);
                }
            }
            setSelectedEvent(null);
            queryClient.invalidateQueries({ queryKey: ['appointments'] }); // Lädt die Zahlen neu (Teilnehmerzahl etc.)
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
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
        setCurrentEvent(event);

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
        const booking = currentParticipants.find(b => b.id === bookingId);
        const isVip = booking?.user?.is_vip;
        const confirmMsg = isVip 
            ? "Dieser Kunde ist VIP. Es wird kein Guthaben abgezogen, nur der Fortschritt eingetragen. Fortfahren?"
            : "Guthaben für diesen Termin jetzt abziehen?";

        if (!confirm(confirmMsg)) return;
        try {
            await apiClient.billBooking(bookingId, token);
            alert(isVip ? "Fortschritt erfolgreich eingetragen." : "Abrechnung erfolgreich.");
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        } catch (e: any) {
            alert(e.message || "Fehler bei der Abrechnung");
        }
    };

    const handleBillAllParticipants = async () => {
        const confirmedList = currentParticipants.filter(b => b.status === 'confirmed');
        if (confirmedList.length === 0) {
            alert("Keine bestätigten Teilnehmer zum Abrechnen.");
            return;
        }

        const vipCount = confirmedList.filter(b => b.user?.is_vip).length;
        const regularCount = confirmedList.length - vipCount;
        
        let confirmMsg = `Möchtest du wirklich alle ${confirmedList.length} Teilnehmer gleichzeitig abrechnen?`;
        if (vipCount > 0) {
            confirmMsg = `Möchtest du wirklich alle ${confirmedList.length} Teilnehmer abrechnen?\n(${regularCount} reguläre Abrechnungen, ${vipCount} VIP-Fortschritte ohne Abzug)`;
        }

        if (!confirm(confirmMsg)) return;

        const apptId = confirmedList[0]?.appointment_id;
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
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
            const current = queryClient.getQueryData<Appointment[]>(['appointments', token]) || [];
            queryClient.setQueryData(['appointments', token], current.filter(a => a.id !== appointmentId));
            return;
        }
        try {
            await apiClient.delete(`/api/appointments/${appointmentId}`, token);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
                // Tab "Alle": Nur Zukunft/Heute anzeigen (Standardverhalten)
                const shouldShow = isFutureOrToday;
                // NEU: Block-Filterung
                // Wenn es ein Block-Kurs ist (block_id vorhanden):
                // 1. Wenn User diesen Block NICHT gebucht hat: Zeige NUR den allerersten Termin des Blocks (start date).
                // 2. Wenn User diesen Block gebucht hat: Zeige ALLE Termine.
                if (shouldShow && a.block_id) {
                    // Ist User eingeschrieben?
                    const enrolled = isBlockEnrolled(a.block_id, myBookings, appointments);
                    if (!enrolled) {
                        // User ist NICHT eingeschrieben -> Zeige nur den ersten Termin des Blocks
                        // Finde den ersten Termin des Blocks in der GESAMTEN Liste (nicht nur gefiltert)
                        const blockEvents = appointments.filter(evt => evt.block_id === a.block_id).sort((x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime());
                        const firstEvent = blockEvents[0];

                        // Wenn dieser Termin nicht der erste ist, verstecke ihn
                        if (firstEvent && a.id !== firstEvent.id) {
                            return false;
                        }
                    }
                }

                return shouldShow;
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

            {/* Color Legend - Now showing Color Rules */}
            <div className="color-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {colorRules.length > 0 ? (
                    colorRules.map(rule => (
                        <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ display: 'block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: rule.color }}></span>
                            <span>{rule.name}</span>
                        </div>
                    ))
                ) : (
                    <span style={{ fontStyle: 'italic', color: 'var(--text-light)' }}>Es wurden noch keine Farbregeln definiert.</span>
                )}
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

            {isPageLoading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Lade Termine...</div> : (
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
                                        const eventColor = getCategoryColor(event, colorRules);
                                        let barColors = [eventColor];

                                        /* Logic for overriding colors based on old settings REMOVED.
                                           Now strictly following color rules or keywords. */

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
                                                    width: '24px',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    {barColors.map((color: string, i: number) => (
                                                        <div key={i} style={{ flex: 1, backgroundColor: color }} />
                                                    ))}
                                                </div>
                                                {/* Klickbarer Bereich für Details */}
                                                <div className="event-details">
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
                                                        {event.is_open_for_all ? (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--brand-green)', background: 'var(--bg-accent-success)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--success-color-light)' }}>
                                                                Alle dürfen kommen
                                                            </div>
                                                        ) : event.target_levels?.map((lvl: any) => (
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
                    allAppointments={appointments}
                    isDarkMode={isDarkMode}
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
                isBlockEvent={!!currentEvent?.block_id}
                levels={allLevels}
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
                    // workshopLectureColor={workshopLectureColor} // REMOVED
                    colorRules={colorRules}
                    allAppointments={appointments}
                    levels={allLevels}
                />
            )}
        </div>
    );
}










