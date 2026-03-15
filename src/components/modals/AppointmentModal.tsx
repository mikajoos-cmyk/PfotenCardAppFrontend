import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Icon from '../ui/Icon';
import { apiClient } from '../../lib/api';
import { extractCoordinates } from '../../lib/mapUtils';
import { Appointment, ColorRule } from '../../types';

// --- HILFSFUNKTIONEN ---
const formatDate = (date: Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
const formatTime = (date: Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
const formatPrice = (price: number | string | null | undefined) => {
    if (price === null || price === undefined || price === '') return '';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '';
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

const getCategoryColor = (event: Appointment, colorRules?: ColorRule[]): string => {
    if (colorRules && colorRules.length > 0) {
        const serviceRule = colorRules.find(r => r.type === 'service' && r.target_ids.includes(event.training_type_id || -1));
        if (serviceRule) return serviceRule.color;

        if (event.target_levels && event.target_levels.length > 0) {
            const levelIds = event.target_levels.map((l: any) => l.id);
            const levelRule = colorRules.find(r => {
                if (r.type !== 'level') return false;
                if (r.match_all) {
                    if (!r.target_ids || r.target_ids.length === 0) return false;
                    return r.target_ids.every(id => levelIds.includes(id));
                }
                return r.target_ids.some(id => levelIds.includes(id));
            });
            if (levelRule) return levelRule.color;
        }
    }
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

// --- KOMPONENTE: Vorlagenauswahl ---
const TemplateSelectionModal = ({ isOpen, onClose, onSelect, allAppointments, isDarkMode, colorRules, locations }: { isOpen: boolean, onClose: () => void, onSelect: (appointment: Appointment) => void, allAppointments: Appointment[], isDarkMode?: boolean, colorRules?: ColorRule[], locations?: any[] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState<'future' | 'past'>('future');

    if (!isOpen) return null;

    const now = new Date();

    const filteredAppointments = allAppointments
        .filter(a => {
            const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || a.location?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            const startTime = new Date(a.start_time).getTime();
            if (timeFilter === 'future') return startTime >= now.getTime();
            return startTime < now.getTime();
        })
        .sort((a, b) => {
            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();
            return timeFilter === 'future' ? timeA - timeB : timeB - timeA;
        });

    const uniqueTemplates: Appointment[] = [];
    const seen = new Set();
    for (const a of filteredAppointments) {
        const key = `${a.title}-${a.description}-${a.location}-${a.training_type_id}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueTemplates.push(a);
        }
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '700px' }}>
                <div className="modal-header green">
                    <h2>Vorlage auswählen</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nach Titel oder Ort suchen..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="segmented-tabs" style={{ marginBottom: '1.5rem' }}>
                        <button className={`segmented-tab-btn ${timeFilter === 'future' ? 'active' : ''}`} onClick={() => setTimeFilter('future')}>Zukünftig</button>
                        <button className={`segmented-tab-btn ${timeFilter === 'past' ? 'active' : ''}`} onClick={() => setTimeFilter('past')}>Vergangen</button>
                    </div>

                    <div className="event-list-container" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {uniqueTemplates.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Keine Vorlagen gefunden.</p>
                        ) : (
                            <ul className="event-list-styled">
                                {uniqueTemplates.map(a => {
                                    const date = new Date(a.start_time);
                                    const eventColor = getCategoryColor(a, colorRules);

                                    // Display name for the location
                                    let locationDisplayName = a.location;
                                    if (locations && a.location) {
                                        const matchingLoc = locations.find(l => l.google_maps_link === a.location || l.name === a.location);
                                        if (matchingLoc) {
                                            locationDisplayName = matchingLoc.name;
                                        }
                                    }

                                    return (
                                        <li key={a.id} className="event-item-styled" onClick={() => onSelect(a)} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', marginBottom: '0.75rem', padding: '1rem 1rem 1rem 2rem' }}>
                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', backgroundColor: eventColor }} />

                                            <div className="event-details">
                                                <span className="event-title" style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</span>
                                                <div className="event-line-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Icon name="calendar" size={12} style={{ opacity: 0.7 }} />{formatDate(date)}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Icon name="clock" size={12} style={{ opacity: 0.7 }} />{formatTime(date)}</span>
                                                    {a.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Icon name="map-pin" size={12} style={{ opacity: 0.7 }} />{locationDisplayName}</span>}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="button button-outline">Abbrechen</button>
                </div>
            </div>
        </div>
    );
};

// --- KOMPONENTE: Haupt-Modal (Exportiert) ---
interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    allLevels: any[];
    staffUsers: any[];
    allServices: any[];
    initialData?: Appointment | null;
    showLeistung?: boolean;
    defaultDuration: number;
    defaultMaxParticipants: number;
    allAppointments: Appointment[];
    isDarkMode?: boolean;
    colorRules?: ColorRule[];
    locations?: any[];
    token: string | null;
    autoBillingEnabled?: boolean;
    autoProgressEnabled?: boolean;
}

export default function AppointmentModal({
                                             isOpen, onClose, onSave, allLevels, staffUsers, allServices, initialData,
                                             showLeistung, defaultDuration, defaultMaxParticipants, allAppointments,
                                             isDarkMode, colorRules, locations, token, autoBillingEnabled, autoProgressEnabled
                                         }: AppointmentModalProps) {

    const queryClient = useQueryClient();
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
    const [newLocName, setNewLocName] = useState('');
    const [newLocLink, setNewLocLink] = useState('');
    const [newLocSaveGlobal, setNewLocSaveGlobal] = useState(false);
    const [isSavingLoc, setIsSavingLoc] = useState(false);

    const [formData, setFormData] = useState({
        title: '', description: '', date: '', start_time: '', end_time: '',
        duration: defaultDuration, location: '', max_participants: defaultMaxParticipants,
        trainer_id: '', training_type_id: '', target_level_ids: [] as number[],
        price: null as number | null, group_price: null as number | null,
        is_open_for_all: false, is_recurring: false, recurrence_pattern: 'weekly',
        end_after_count: 4, end_at_date: '', is_block: false
    });

    const calculateEndTime = (start: string, duration: number) => {
        if (!start) return '';
        try {
            const [h, m] = start.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m + duration);
            return date.toTimeString().slice(0, 5);
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
                price: initialData.price || null,
                group_price: initialData.block_id ? (allAppointments.filter(a => a.block_id === initialData.block_id).reduce((sum, a) => sum + (a.price || 0), 0) || null) : null,
                is_open_for_all: initialData.is_open_for_all || false,
                is_recurring: !!initialData.block_id,
                recurrence_pattern: 'weekly',
                end_after_count: allAppointments.filter(a => a.block_id === initialData.block_id).length,
                end_at_date: '',
                is_block: !!initialData.block_id
            });
        } else {
            setFormData({
                title: '', description: '', date: '', start_time: '', end_time: '',
                duration: defaultDuration, location: '', max_participants: defaultMaxParticipants,
                trainer_id: '', training_type_id: '', target_level_ids: [],
                price: null, group_price: null, is_open_for_all: false,
                is_recurring: false, recurrence_pattern: 'weekly', end_after_count: 4,
                end_at_date: '', is_block: false
            });
        }
    }, [initialData, isOpen, defaultDuration, defaultMaxParticipants]);

    if (!isOpen) return null;

    const handleSaveLocation = async () => {
        if (!newLocName) { alert('Bitte geben Sie einen Namen für den Ort ein.'); return; }
        setIsSavingLoc(true);
        try {
            let lat = null; let lng = null;
            if (newLocLink) {
                const coords = extractCoordinates(newLocLink);
                if (coords) { lat = parseFloat(coords.lat); lng = parseFloat(coords.lng); }
            }

            const newLoc: any = {
                id: Date.now(), name: newLocName, google_maps_link: newLocLink || '',
                lat: lat, lng: lng, is_public: newLocSaveGlobal
            };

            const currentConfig = await apiClient.getConfig();
            const currentLocations = currentConfig?.tenant?.config?.appointments?.locations || [];

            const updatedConfig = {
                ...currentConfig.tenant.config,
                appointments: {
                    ...currentConfig.tenant.config.appointments,
                    locations: [...currentLocations, newLoc]
                }
            };

            const settingsData = {
                school_name: currentConfig.tenant.name,
                primary_color: currentConfig.tenant.config.branding.primary_color,
                secondary_color: currentConfig.tenant.config.branding.secondary_color,
                background_color: currentConfig.tenant.config.branding.background_color,
                sidebar_color: currentConfig.tenant.config.branding.sidebar_color,
                level_term: currentConfig.tenant.config.wording.level,
                vip_term: currentConfig.tenant.config.wording.vip,
                services: currentConfig.training_types.map((s: any) => ({
                    id: s.id, name: s.name, category: s.category, price: s.default_price, rank_order: s.rank_order
                })),
                levels: currentConfig.levels.map((l: any) => ({
                    id: l.id, name: l.name, rank_order: l.rank_order, color: l.color
                })),
                appointments: updatedConfig.appointments
            };

            await apiClient.put('/api/settings', settingsData, token);
            await queryClient.invalidateQueries({ queryKey: ['config'] });

            setFormData({ ...formData, location: newLocLink || newLocName });
            setNewLocName(''); setNewLocLink(''); setNewLocSaveGlobal(false); setIsAddLocationOpen(false);
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Fehler beim Speichern des Ortes.');
        } finally {
            setIsSavingLoc(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isAutomationActive = (typeof autoBillingEnabled !== 'undefined' && autoBillingEnabled) || (typeof autoProgressEnabled !== 'undefined' && autoProgressEnabled);
        if (isAutomationActive && !formData.training_type_id) {
            alert("Bitte wählen Sie eine Leistung aus (erforderlich für die aktive Automatisierung).");
            return;
        }

        const start = new Date(`${formData.date}T${formData.start_time}`);
        const end = new Date(`${formData.date}T${formData.end_time}`);

        let finalPrice = formData.price ? Number(formData.price) : null;
        if ((formData.is_recurring || formData.is_block) && formData.group_price) {
            const count = Number(formData.end_after_count) || 1;
            finalPrice = Number((Number(formData.group_price) / count).toFixed(2));
        }

        if (!formData.location) {
            alert("Bitte geben Sie einen Ort für den Termin ein.");
            return;
        }

        onSave({
            title: formData.title, description: formData.description,
            start_time: start.toISOString(), end_time: end.toISOString(),
            is_open_for_all: formData.is_open_for_all, location: formData.location,
            max_participants: Number(formData.max_participants),
            trainer_id: formData.trainer_id ? Number(formData.trainer_id) : null,
            training_type_id: formData.training_type_id ? Number(formData.training_type_id) : null,
            price: finalPrice,
            target_level_ids: formData.is_open_for_all ? allLevels.map(l => l.id) : formData.target_level_ids,
            ...(formData.is_recurring && !initialData ? {
                recurrence_pattern: formData.recurrence_pattern,
                end_after_count: formData.end_after_count,
                end_at_date: formData.end_at_date ? new Date(formData.end_at_date).toISOString() : null,
                is_block: formData.is_block
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

    const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
        <h3 style={{
            fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem'
        }}>
            <div style={{ backgroundColor: 'var(--bg-accent-blue)', color: 'var(--brand-blue)', padding: '0.4rem', borderRadius: '0.5rem', display: 'flex' }}>
                <Icon name={icon} size={16} />
            </div>
            {title}
        </h3>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '650px' }}>
                <div className="modal-header blue">
                    <h2>{initialData ? 'Termin bearbeiten' : 'Neuen Termin erstellen'}</h2>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>

                <div className="modal-body" style={{ padding: '1.5rem 2rem' }}>

                    {!initialData && (
                        <div style={{
                            backgroundColor: 'var(--bg-accent-blue)', padding: '1rem 1.5rem', borderRadius: '0.75rem',
                            marginBottom: '2rem', border: '1px dashed var(--brand-blue)', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                        }}>
                            <div>
                                <strong style={{ color: 'var(--brand-blue)', display: 'block', fontSize: '1rem' }}>Zeit sparen?</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nutze einen bestehenden Termin als Vorlage.</span>
                            </div>
                            <button type="button" className="button button-primary" style={{ backgroundColor: 'var(--brand-blue)', borderColor: 'var(--brand-blue)' }} onClick={() => setIsTemplateModalOpen(true)}>
                                <Icon name="copy" size={16} /> Vorlage laden
                            </button>
                        </div>
                    )}

                    <TemplateSelectionModal
                        isOpen={isTemplateModalOpen}
                        onClose={() => setIsTemplateModalOpen(false)}
                        allAppointments={allAppointments}
                        isDarkMode={isDarkMode}
                        colorRules={colorRules}
                        locations={locations}
                        onSelect={(template) => {
                            const start = new Date(template.start_time);
                            const end = new Date(template.end_time);
                            const dur = Math.round((end.getTime() - start.getTime()) / 60000);

                            setFormData(prev => ({
                                ...prev,
                                title: template.title || '',
                                description: template.description || '',
                                start_time: start.toTimeString().slice(0, 5),
                                duration: dur,
                                end_time: end.toTimeString().slice(0, 5),
                                location: template.location || '',
                                max_participants: template.max_participants || 10,
                                trainer_id: template.trainer_id?.toString() || '',
                                training_type_id: template.training_type_id?.toString() || '',
                                target_level_ids: (template.target_levels && template.target_levels.length > 0)
                                    ? template.target_levels.map((l: any) => l.id)
                                    : (template.target_level_ids || []),
                                price: template.price || null,
                                is_open_for_all: template.is_open_for_all || false,
                            }));
                            setIsTemplateModalOpen(false);
                        }}
                    />

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* SEKTION: Grunddaten */}
                        <div>
                            <SectionHeader title="Grunddaten" icon="file-text" />
                            <div className="form-group">
                                <label>Titel des Termins *</label>
                                <input required className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="z.B. Welpen-Spielstunde" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Beschreibung (Optional)</label>
                                <textarea className="form-input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Weitere Details für die Teilnehmer..." />
                            </div>
                        </div>

                        {/* SEKTION: Zeit & Ort */}
                        <div>
                            <SectionHeader title="Wann & Wo" icon="calendar" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Datum *</label>
                                    <input type="date" required className="form-input" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Max. Teilnehmer *</label>
                                    <input type="number" required min="1" className="form-input" value={formData.max_participants} onChange={e => setFormData({ ...formData, max_participants: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Startzeit *</label>
                                    <input type="time" required className="form-input" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} value={formData.start_time} onChange={e => {
                                        const newStart = e.target.value;
                                        const newEnd = calculateEndTime(newStart, formData.duration);
                                        setFormData({ ...formData, start_time: newStart, end_time: newEnd });
                                    }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Dauer (Minuten) *</label>
                                    <input type="number" required min="5" className="form-input" value={formData.duration} onChange={e => {
                                        const newDur = parseInt(e.target.value) || 0;
                                        const newEnd = calculateEndTime(formData.start_time, newDur);
                                        setFormData({ ...formData, duration: newDur, end_time: newEnd });
                                    }} />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Ort des Trainings *</label>
                                {locations && locations.length > 0 ? (
                                    <>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <select className="form-input" style={{ flex: 1 }} value={locations.some(l => l.google_maps_link === formData.location || l.name === formData.location) ? formData.location : ''} onChange={e => setFormData({ ...formData, location: e.target.value })} required={!formData.location}>
                                                <option value="">Gespeicherten Ort wählen...</option>
                                                {locations.filter((loc: any) => loc.is_public !== false || (loc.google_maps_link === formData.location || loc.name === formData.location)).map((loc: any) => (
                                                    <option key={loc.id} value={loc.google_maps_link || loc.name}>{loc.name}</option>
                                                ))}
                                            </select>
                                            <button type="button" className="button button-outline" onClick={() => setIsAddLocationOpen(true)} title="Neuen Ort anlegen" style={{ padding: '0.5rem 0.75rem' }}>
                                                <Icon name="plus" size={18} />
                                            </button>
                                        </div>
                                        {(!locations.some(l => l.google_maps_link === formData.location || l.name === formData.location)) && (
                                            <input className="form-input" style={{ marginTop: '0.5rem' }} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Oder manuell eingeben (z.B. Online / Waldweg)" required autoFocus />
                                        )}
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input className="form-input" style={{ flex: 1 }} value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Trainingsplatz / Online" required />
                                        <button type="button" className="button button-outline" onClick={() => setIsAddLocationOpen(true)} title="Orte verwalten" style={{ padding: '0.5rem 0.75rem' }}>
                                            <Icon name="plus" size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SEKTION: Leistung & Preis */}
                        {showLeistung && (
                            <div>
                                <SectionHeader title="Leistung & Abrechnung" icon="dollar" />
                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Leistung (Kategorie) *</label>
                                        <select className="form-input" value={formData.training_type_id} onChange={e => setFormData({ ...formData, training_type_id: e.target.value })}>
                                            <option value="">Leistung wählen...</option>
                                            {allServices.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.default_price}€)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>{(formData.is_recurring || formData.is_block) ? 'Preis pro Termin (€)' : 'Indiv. Preis (€)'}</label>
                                        <input type="number" step="0.50" className="form-input" placeholder="Standard-Preis" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : null })} />
                                    </div>
                                </div>

                                {(formData.is_recurring || formData.is_block) && (
                                    <div style={{ background: 'var(--bg-accent-green)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--text-accent-green)', marginTop: '1rem' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--brand-green)', display: 'block', marginBottom: '0.25rem' }}>Pauschalpreis für den gesamten Kurs (€)</label>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Der Betrag wird automatisch auf alle {formData.end_after_count} Termine umgelegt.</p>
                                        <input type="number" step="0.50" className="form-input" style={{ borderColor: formData.group_price ? 'var(--brand-green)' : 'var(--border-color)' }} placeholder="z.B. 150.00" value={formData.group_price || ''} onChange={e => setFormData({ ...formData, group_price: e.target.value ? parseFloat(e.target.value) : null })} />
                                        {formData.group_price && (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--brand-green)', marginTop: '0.5rem', fontWeight: 500 }}>
                                                <Icon name="check" size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                                                Entspricht {(formData.group_price / (Number(formData.end_after_count) || 1)).toFixed(2)}€ pro Einzeltermin.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SEKTION: Zielgruppe & Trainer */}
                        <div>
                            <SectionHeader title="Zielgruppe & Trainer" icon="users" />

                            <div className="form-group">
                                <label>Zuständiger Trainer</label>
                                <select className="form-input" value={formData.trainer_id} onChange={e => setFormData({ ...formData, trainer_id: e.target.value })}>
                                    <option value="">Nicht zugewiesen</option>
                                    {staffUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ backgroundColor: 'var(--background-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.is_open_for_all ? 0 : '1rem' }}>
                                    <div>
                                        <label style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Alle dürfen teilnehmen</label>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Level-Voraussetzungen deaktivieren.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" checked={formData.is_open_for_all} onChange={e => setFormData({ ...formData, is_open_for_all: e.target.checked })} />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                {!formData.is_open_for_all && (
                                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Erlaubte Level (Mehrfachauswahl)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {allLevels.map(lvl => (
                                                <button
                                                    key={lvl.id}
                                                    type="button"
                                                    onClick={() => toggleLevel(lvl.id)}
                                                    className={`button button-small ${formData.target_level_ids.includes(lvl.id) ? 'button-primary' : 'button-outline'}`}
                                                    style={{ borderRadius: '20px' }}
                                                >
                                                    {lvl.name}
                                                </button>
                                            ))}
                                        </div>
                                        {formData.target_level_ids.length === 0 && (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--brand-orange)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Icon name="alert-circle" size={14} /> Bitte wähle mindestens ein Level aus.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SEKTION: Wiederholung */}
                        {(!initialData || formData.is_block) && (
                            <div>
                                <SectionHeader title="Wiederholung & Kursblock" icon="refresh" />

                                <div style={{ backgroundColor: 'var(--background-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.is_recurring ? '1rem' : 0 }}>
                                        <div>
                                            <label style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {initialData ? 'Teil eines Pakets / Kurses' : 'Wiederkehrender Termin'}
                                            </label>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Termin automatisch mehrfach erstellen.</p>
                                        </div>
                                        <label className="switch">
                                            <input type="checkbox" disabled={!!initialData} checked={formData.is_recurring} onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>

                                    {formData.is_recurring && (
                                        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {initialData && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--brand-orange)', background: 'var(--bg-accent-orange)', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 500, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <Icon name="alert-circle" size={18} style={{ flexShrink: 0 }} />
                                                    <span>Achtung: Änderungen an Datum oder Uhrzeit verschieben das GESAMTE Paket proportional ab diesem Termin.</span>
                                                </div>
                                            )}

                                            {!initialData && (
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label>Rhythmus</label>
                                                    <select className="form-input" value={formData.recurrence_pattern} onChange={e => setFormData({ ...formData, recurrence_pattern: e.target.value })}>
                                                        <option value="daily">Täglich</option>
                                                        <option value="weekly">Wöchentlich</option>
                                                        <option value="biweekly">Alle 2 Wochen</option>
                                                        <option value="weekdays">Wochentage (Mo-Fr)</option>
                                                    </select>
                                                </div>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label>Anzahl Termine (Gesamt)</label>
                                                    <input type="number" disabled={!!initialData} className="form-input" style={{ backgroundColor: initialData ? 'transparent' : undefined }} value={formData.end_after_count} onChange={e => setFormData({ ...formData, end_after_count: parseInt(e.target.value) || 0, end_at_date: '' })} />
                                                </div>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label>Oder End-Datum</label>
                                                    <input type="date" disabled={!!initialData} className="form-input" style={{ colorScheme: isDarkMode ? 'dark' : 'light', backgroundColor: initialData ? 'transparent' : undefined }} value={formData.end_at_date} onChange={e => setFormData({ ...formData, end_at_date: e.target.value, end_after_count: 0 })} />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                                <div>
                                                    <label style={{ margin: 0, fontWeight: 600, color: 'var(--brand-blue)' }}>Als geschlossenen Kurs anlegen</label>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kunden buchen das gesamte Paket auf einmal.</p>
                                                </div>
                                                <label className="switch">
                                                    <input type="checkbox" disabled={!!initialData} checked={formData.is_block} onChange={e => setFormData({ ...formData, is_block: e.target.checked })} />
                                                    <span className="slider round"></span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Anzeige der Block-Termine im Editier-Modus */}
                                {initialData && initialData.block_id && allAppointments && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-accent-blue)', borderRadius: '0.75rem', border: '1px solid var(--text-accent-blue)' }}>
                                        <label style={{ display: 'flex', marginBottom: '0.75rem', fontWeight: 600, color: 'var(--brand-blue)', alignItems: 'center', gap: '0.5rem' }}>
                                            <Icon name="layers" size={18} />
                                            Alle Termine in diesem Block:
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                            {allAppointments
                                                .filter(a => a.block_id === initialData.block_id)
                                                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                                .map((a, idx) => (
                                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: a.id === initialData.id ? 'var(--brand-blue)' : 'var(--background-secondary)', opacity: a.id === initialData.id ? 1 : 0.8, color: a.id === initialData.id ? 'white' : 'var(--text-primary)', borderRadius: '0.4rem', fontWeight: a.id === initialData.id ? 600 : 400 }}>
                                                        <span>{idx + 1}. {new Date(a.start_time).toLocaleDateString('de-DE')}</span>
                                                        <span>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(a.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="submit" style={{ display: 'none' }}>Speichern</button>
                    </form>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--background-secondary)' }}>
                    <button type="button" onClick={onClose} className="button button-outline">Abbrechen</button>
                    <button type="button" onClick={handleSubmit} className="button button-primary">
                        {initialData ? 'Änderungen speichern' : 'Termin erstellen'}
                    </button>
                </div>
            </div>

            {/* Ort Hinzufügen Modal */}
            {isAddLocationOpen && (
                <div className="modal-overlay" style={{ zIndex: 2100 }}>
                    <div className="modal-content" style={{ maxWidth: '450px', width: '90%' }}>
                        <div className="modal-header">
                            <h2>Neuen Ort hinzufügen</h2>
                            <button className="close-button" onClick={() => setIsAddLocationOpen(false)}>
                                <Icon name="x" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Name des Ortes</label>
                                <input className="form-input" value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="z.B. Trainingsgelände Wald" autoFocus />
                            </div>
                            <div className="form-group">
                                <label>Google Maps Link (optional)</label>
                                <input className="form-input" value={newLocLink} onChange={e => setNewLocLink(e.target.value)} placeholder="https://maps.google.com/..." />
                                {newLocLink && (() => {
                                    const coords = extractCoordinates(newLocLink);
                                    if (coords) return <p style={{ fontSize: '0.75rem', color: 'var(--brand-green)', marginTop: '0.25rem', fontWeight: 600 }}>✓ Koordinaten extrahiert: {coords.lat}, {coords.lng}</p>;
                                    return <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Koordinaten werden automatisch extrahiert, falls vorhanden.</p>;
                                })()}
                            </div>

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', background: 'var(--background-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                <label style={{ margin: 0, fontSize: '0.9rem' }}>
                                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Als Vorlage speichern?</strong>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>Dann für alle Termine dauerhaft verfügbar.</span>
                                </label>
                                <label className="switch">
                                    <input type="checkbox" checked={newLocSaveGlobal} onChange={e => setNewLocSaveGlobal(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={() => setIsAddLocationOpen(false)} className="button button-outline" disabled={isSavingLoc}>Abbrechen</button>
                            <button type="button" onClick={handleSaveLocation} className="button button-primary" disabled={isSavingLoc || !newLocName}>
                                {isSavingLoc ? 'Speichert...' : 'Ort übernehmen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}