import React, { useEffect, useMemo, useState } from 'react';

function useQueryParam(key: string, defaultValue?: string) {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || defaultValue || '';
  }, [key, defaultValue]);
}

export default function StatusWidget() {
  // Token aus Pfad
  const pathMatch = window.location.pathname.match(/\/widget\/status\/(.+)$/);
  const token = pathMatch ? decodeURIComponent(pathMatch[1]) : '';

  // Query-Parameter (Theme optional; primär für Einbettung im Marketing‑Bereich)
  const theme = useQueryParam('theme', 'light');

  const [data, setData] = useState<{ status: 'active' | 'partial' | 'cancelled' | string; message?: string; updated_at?: string; branding?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiBase}/api/public/widget/${token}/status`);
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

  // Abgeleitete Flags wie im App‑Banner
  const isCancelled = (data?.status || '') === 'cancelled';
  const isPartial = (data?.status || '') === 'partial';
  const bannerClass = `status-banner ${isCancelled ? 'is-cancelled' : isPartial ? 'is-partial' : 'is-active'}`;

  // Headline wie in der App
  const defaultMessage = isCancelled
    ? 'Die Hundeschule fällt aus.'
    : isPartial
    ? 'Einschränkungen im Betrieb. Bitte Details beachten.'
    : 'Alle Stunden finden wie geplant statt.';


  // Icons exakt wie im App‑Banner
  const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
  const CrossIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
  const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );

  return (
    <>
      {loading && <p style={{ fontSize: '14px', opacity: 0.8, color: '#94A3B8' }}>Lade Status…</p>}
      {error && <p style={{ fontSize: '14px', color: '#ef4444' }}>{error}</p>}
      {!loading && !error && data && (
        <div className={bannerClass} role="alert" style={{ margin: 0 }}>
          {isCancelled ? <CrossIcon /> : isPartial ? <WarningIcon /> : <CheckIcon />}
          <div className="status-banner-content">
            <h4 className="status-banner-headline">{defaultMessage}</h4>
            {data.message && <p className="status-banner-message">{data.message}</p>}
            {data.updated_at && (
              <p className="status-banner-time">Stand: {new Date(data.updated_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} Uhr</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
