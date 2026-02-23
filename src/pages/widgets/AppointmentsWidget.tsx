import React, { useEffect, useMemo, useState } from 'react';

function useQueryParam(key: string, defaultValue?: string) {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || defaultValue || '';
  }, [key, defaultValue]);
}

interface PublicAppointment {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  max_participants?: number;
  participants_count?: number;
  training_type_id?: number | null;
  training_type?: { id?: number; name: string } | null;
  target_levels?: { id: number; name: string }[];
  is_open_for_all?: boolean;
}

interface ColorRule {
  type: 'service' | 'level';
  target_ids: number[];
  color: string;
  match_all?: boolean;
}

// Farbzuordnung wie in der App: Erst dynamische Farbregeln, dann Fallback über Keywords
const getCategoryColor = (event: PublicAppointment, colorRules?: ColorRule[]): string => {
  if (colorRules && colorRules.length > 0) {
    // 1) Regel nach Leistung (service)
    if (event.training_type_id != null) {
      const serviceRule = colorRules.find(r => r.type === 'service' && r.target_ids?.includes(event.training_type_id as number));
      if (serviceRule) return serviceRule.color;
    }
    // 2) Regel nach Level(n)
    const levels = event.target_levels || [];
    if (levels.length > 0) {
      const levelIds = levels.map(l => l.id);
      const levelRule = colorRules.find(r => {
        if (r.type !== 'level') return false;
        if (r.match_all) {
          if (!r.target_ids || r.target_ids.length === 0) return false;
          return r.target_ids.every(id => levelIds.includes(id));
        }
        return r.target_ids?.some(id => levelIds.includes(id));
      });
      if (levelRule) return levelRule.color;
    }
  }

  // 3) Fallback auf Keywords im Titel
  const t = (event.title || '').toLowerCase();
  if (t.includes('welpe')) return 'orchid';
  if (t.includes('grund') || t.includes('basis') || t.includes('level 2')) return 'limegreen';
  if (t.includes('fort') || t.includes('level 3')) return 'skyblue';
  if (t.includes('master') || t.includes('level 4')) return 'peru';
  if (t.includes('prüfung')) return 'tomato';
  if (t.includes('theorie') || t.includes('vortrag')) return 'khaki';
  if (t.includes('workshop') || t.includes('special')) return 'darkkhaki';
  return 'gold';
};

export default function AppointmentsWidget() {
  const pathMatch = window.location.pathname.match(/\/widget\/appointments\/(.+)$/);
  const token = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

  const theme = useQueryParam('theme', 'light');
  const layout = useQueryParam('layout', 'detailed');
  const limit = parseInt(useQueryParam('limit', '5'), 10);

  const [data, setData] = useState<{ appointments: PublicAppointment[]; branding?: any; appointments_config?: { color_rules?: ColorRule[] } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiBase}/api/public/widget/${token}/appointments`);
        if (!res.ok) throw new Error(`Fehler ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message || 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const appointments = (data?.appointments || []);
  const displayedAppointments = layout === 'calendar' ? appointments : appointments.slice(0, limit);

  // Kalender-Logik
  const calendarDays = useMemo(() => {
    if (layout !== 'calendar') return [];
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Wochentag von heute (0 = So, 1 = Mo, ..., 6 = Sa)
    // Wir wollen aber oft mit Montag anfangen, oder einfach stur 7 Tage pro Zeile.
    // Der User sagt "immer 7 tage in einer zeile".
    // Wenn wir heute anfangen, ist heute der erste Tag in der ersten Zeile.
    
    for (let i = 0; i < limit; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayAppointments = appointments.filter(a => a.start_time.startsWith(dateStr));
      
      const isFirstDayOfMonth = d.getDate() === 1 || i === 0;
      const monthLabel = isFirstDayOfMonth ? d.toLocaleString('de-DE', { month: 'short' }) : null;

      days.push({
        date: d,
        dateStr,
        appointments: dayAppointments,
        monthLabel,
        isNewMonth: d.getDate() === 1
      });
    }
    return days;
  }, [layout, appointments, limit]);

  const containerStyle: React.CSSProperties = {
    padding: layout === 'compact' ? '12px' : '20px',
    backgroundColor: 'transparent',
    fontFamily: "'Poppins', 'system-ui', sans-serif",
    lineHeight: 1.5,
    minHeight: '100%',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b'
  };

  const formatDate = (d: string | Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(d));
  const formatTime = (d: string | Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));

  const colorRules = data?.appointments_config?.color_rules || [];

  return (
    <div style={containerStyle}>
      {/* Header wie in der App (schlicht) */}
      {data?.branding?.school_name && (
        <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: theme === 'dark' ? '#94a3b8' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {data.branding.school_name}
        </h2>
      )}

      {loading && <p style={{ fontSize: '14px', opacity: 0.8, color: '#94A3B8' }}>Lade Termine…</p>}
      {error && <p style={{ fontSize: '14px', color: '#ef4444' }}>{error}</p>}

      {!loading && !error && layout === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', gap: '4px', marginBottom: '4px', opacity: 0.5, fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
            <div />
            <div>Mo</div>
            <div>Di</div>
            <div>Mi</div>
            <div>Do</div>
            <div>Fr</div>
            <div>Sa</div>
            <div>So</div>
          </div>
          
          {/* Gruppierung der Tage in 7er Blöcke basierend auf Wochentag oder einfach stur 7 pro Zeile ab heute? */}
          {/* User sagt "immer 7 tage in einer zeile". Wenn wir heute anfangen, ist heute Tag 1. */}
          {(() => {
            const monthGroups: { monthName: string, days: any[] }[] = [];
            
            calendarDays.forEach(day => {
              const monthName = day.date.toLocaleString('de-DE', { month: 'short' });
              let lastGroup = monthGroups[monthGroups.length - 1];
              if (!lastGroup || lastGroup.monthName !== monthName) {
                lastGroup = { monthName, days: [] };
                monthGroups.push(lastGroup);
              }
              lastGroup.days.push(day);
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const getDayIdx = (d: Date) => (d.getDay() + 6) % 7;

            return monthGroups.map((group, groupIdx) => {
              const rows = [];
              const firstDay = group.days[0].date;
              const startOffset = getDayIdx(firstDay);
              
              // Padding für den Anfang des Monats (damit die Wochentage stimmen)
              const initialPadding = Array(startOffset).fill(null);
              const allItems = [...initialPadding, ...group.days];
              
              for (let i = 0; i < allItems.length; i += 7) {
                const week = allItems.slice(i, i + 7);
                rows.push(
                  <div key={`${groupIdx}-${i}`} style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', gap: '4px', alignItems: 'stretch' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      color: theme === 'dark' ? '#94a3b8' : '#64748b',
                      textTransform: 'uppercase'
                    }}>
                      {i === 0 ? group.monthName : ''}
                    </div>
                    {week.map((day, idx) => (
                      day ? (
                        <div 
                          key={day.dateStr} 
                          onClick={() => day.appointments.length > 0 && setSelectedDay(day.dateStr)}
                          style={{
                            aspectRatio: '1',
                            border: '1px solid',
                            borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: day.appointments.length > 0 ? 'pointer' : 'default',
                            position: 'relative',
                            backgroundColor: theme === 'dark' ? 'transparent' : 'white',
                            padding: '2px',
                            opacity: day.date.setHours(0,0,0,0) === today.getTime() ? 1 : 0.9
                          }}
                        >
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: day.date.setHours(0,0,0,0) === today.getTime() ? 800 : 600, 
                            opacity: 0.8,
                            color: day.date.setHours(0,0,0,0) === today.getTime() ? 'var(--primary-color)' : 'inherit'
                          }}>
                            {day.date.getDate()}
                          </span>
                          <div style={{ display: 'flex', gap: '2px', marginTop: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {day.appointments.map((a) => (
                              <div 
                                key={a.id} 
                                style={{ 
                                  width: day.appointments.length > 4 ? '6px' : '8px', 
                                  height: day.appointments.length > 4 ? '6px' : '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: getCategoryColor(a, colorRules) 
                                }} 
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div key={`empty-${groupIdx}-${i}-${idx}`} style={{ aspectRatio: '1' }} />
                      )
                    ))}
                  </div>
                );
              }

              return (
                <div key={group.monthName} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: groupIdx < monthGroups.length - 1 ? '12px' : 0 }}>
                  {rows}
                </div>
              );
            });
          })()}
        </div>
      )}

      {!loading && !error && layout !== 'calendar' && (
        <ul className="event-list-styled">
          {displayedAppointments.map((a) => {
            const color = getCategoryColor(a, colorRules);
            const capacityKnown = typeof a.max_participants === 'number';
            const isFull = capacityKnown && (a.participants_count || 0) >= (a.max_participants || 0);
            const free = capacityKnown ? Math.max(0, (a.max_participants || 0) - (a.participants_count || 0)) : null;

            return (
              <li key={a.id} className="event-item-styled" style={{ 
                position: 'relative', 
                overflow: 'hidden',
                padding: layout === 'compact' ? '0.75rem 0.75rem 0.75rem 2rem' : undefined,
                marginBottom: layout === 'compact' ? '0.5rem' : undefined,
                gap: layout === 'compact' ? '0.5rem' : undefined
              }}>
                {/* Linker Farbbalken wie in der App */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: layout === 'compact' ? '12px' : '24px', backgroundColor: color }} />

                <div className="event-details">
                  <span className="event-title" style={{ 
                    fontSize: layout === 'compact' ? '0.9rem' : undefined,
                    marginBottom: layout === 'compact' ? '0.1rem' : undefined
                  }}>{a.title}</span>
                  {/* Badges analog zur App: Trainingstyp und ggf. Level */}
                  {layout !== 'compact' && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {a.training_type && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--brand-orange)', background: 'var(--bg-accent-orange)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--warning-color-light)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          {/* kleines Aktivitäts-Icon */}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                          {a.training_type.name}
                        </div>
                      )}
                      {(!a.is_open_for_all && a.target_levels && a.target_levels.length > 0) && a.target_levels.map(lvl => (
                        <div key={lvl.id} style={{ fontSize: '0.7rem', color: 'var(--primary-color)', background: 'var(--bg-accent)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>
                          {lvl.name}
                        </div>
                      ))}
                      {a.is_open_for_all && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--brand-green)', background: 'var(--bg-accent-success)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--success-color-light)' }}>
                          Alle dürfen kommen
                        </div>
                      )}
                    </div>
                  )}
                  <div className="event-line-2" style={{ 
                    fontSize: layout === 'compact' ? '0.75rem' : undefined,
                    gap: layout === 'compact' ? '0.4rem' : undefined
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {formatDate(a.start_time)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {formatTime(a.start_time)}
                    </span>
                    {(a.location && layout !== 'compact') && (
                      <span className="event-location" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {a.location}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {displayedAppointments.length === 0 && (
            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
              Aktuell keine freien Termine
            </li>
          )}
        </ul>
      )}

      {/* Modal für Kalender-Details */}
      {selectedDay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setSelectedDay(null)}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '20px',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}>Termine am {formatDate(selectedDay)}</h3>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>&times;</button>
            </div>
            <ul className="event-list-styled">
              {appointments.filter(a => a.start_time.startsWith(selectedDay)).map(a => {
                const color = getCategoryColor(a, colorRules);
                return (
                  <li key={a.id} className="event-item-styled" style={{ 
                    position: 'relative', 
                    overflow: 'hidden',
                    backgroundColor: theme === 'dark' ? '#0b1220' : undefined,
                    borderColor: theme === 'dark' ? '#334155' : undefined,
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '24px', backgroundColor: color }} />
                    <div className="event-details">
                      <span className="event-title" style={{ color: theme === 'dark' ? '#f1f5f9' : undefined }}>{a.title}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {a.training_type && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--brand-orange)', background: 'var(--bg-accent-orange)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600, border: '1px solid var(--warning-color-light)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            {a.training_type.name}
                          </div>
                        )}
                        {(!a.is_open_for_all && a.target_levels && a.target_levels.length > 0) && a.target_levels.map(lvl => (
                          <div key={lvl.id} style={{ fontSize: '0.7rem', color: 'var(--primary-color)', background: 'var(--bg-accent)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 600 }}>
                            {lvl.name}
                          </div>
                        ))}
                      </div>
                      <div className="event-line-2" style={{ color: theme === 'dark' ? '#94a3b8' : undefined }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          {formatTime(a.start_time)}
                        </span>
                        {a.location && (
                          <span className="event-location" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            {a.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
