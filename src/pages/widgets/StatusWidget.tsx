import React, { useEffect, useMemo, useState, useRef } from 'react';

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

  // Auto-Höhe an den Parent per postMessage melden
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const post = () => {
      const el = rootRef.current || document.querySelector('#status-widget-root') as HTMLElement | null;
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'WIDGET_HEIGHT', height: h }, '*');
      }
    };
    let ro: any = null;
    if ((window as any).ResizeObserver) {
      ro = new (window as any).ResizeObserver(post);
      ro.observe(document.body);
    }
    const t = setInterval(post, 500);
    window.addEventListener('load', post);
    window.addEventListener('resize', post);
    post();
    return () => {
      if (ro) ro.disconnect();
      clearInterval(t);
      window.removeEventListener('load', post);
      window.removeEventListener('resize', post);
    };
  }, [loading, error, data, theme]);

  // Abgeleitete Flags wie im App‑Banner
  const isCancelled = (data?.status || '') === 'cancelled';
  const isPartial = (data?.status || '') === 'partial';
  const bannerClass = `status-banner ${isCancelled ? 'is-cancelled' : isPartial ? 'is-partial' : 'is-active'}`;

  const isDark = theme === 'dark';
  const isTransparent = theme === 'transparent';

  // Branding-Hintergrundfarbe aus API nutzen, falls vorhanden (App-Hintergrund statt Primärfarbe)
  const brandingBg = (data?.branding?.background_color as string | undefined) || (data?.branding?.primary_color as string | undefined);

  // Hilfsfunktion: Kontrastfarbe zu einer HEX-Farbe bestimmen (hell/dunkel)
  const pickTextColorForBg = (hex?: string, darkFallback = '#1e293b', lightFallback = '#e2e8f0') => {
    if (!hex) return darkFallback;
    const m = hex.replace('#', '').match(/.{1,2}/g);
    if (!m || m.length < 3) return darkFallback;
    const [r, g, b] = m.map(x => parseInt(x.length === 1 ? x + x : x, 16));
    // relative luminance
    const [R, G, B] = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    return L > 0.5 ? darkFallback : lightFallback;
  };

  const bgColor = isTransparent
    ? 'transparent'
    : (theme === 'branding' && brandingBg)
      ? brandingBg
      : (isDark ? '#0b1220' : '#ffffff');

  // NEU HINZUFÜGEN: Zwingt den Body-Background dazu, sich an das Theme anzupassen
  useEffect(() => {
    try {
      document.documentElement.style.margin = '0';
      document.documentElement.style.height = 'auto';
      document.documentElement.style.overflowY = 'auto'; 
      document.documentElement.style.position = 'static'; // <--- NEU
      
      document.body.style.margin = '0';
      document.body.style.height = 'auto';
      document.body.style.overflowY = 'auto'; 
      document.body.style.position = 'static'; // <--- NEU
      
      document.body.style.backgroundColor = bgColor;

      // Globales React Root-Element entsperren
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.height = 'auto';
        rootEl.style.minHeight = '100vh';
        rootEl.style.overflow = 'visible';
        rootEl.style.position = 'static'; // <--- NEU
      }
    } catch {}
  }, [bgColor]);

  const fgColor = isTransparent
    ? undefined
    : (theme === 'branding' && brandingBg)
      ? pickTextColorForBg(brandingBg)
      : (isDark ? '#e2e8f0' : '#1e293b');

  const containerStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    color: fgColor,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    borderRadius: 12
  };

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
    <div id="status-widget-root" className="widget-root" ref={rootRef} style={containerStyle}>
      {loading && <p style={{ fontSize: '14px', opacity: 0.8, color: '#94A3B8', margin: 0, padding: '1rem' }}>Lade Status…</p>}
      {error && <p style={{ fontSize: '14px', color: '#ef4444', margin: 0, padding: '1rem' }}>{error}</p>}
      {!loading && !error && data && (
        <div className={bannerClass} role="alert" style={{ margin: 0, borderRadius: 12 }}>
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
    </div>
  );
}
