// src/lib/mapUtils.ts

export const isShortGoogleMapsUrl = (url: string) => {
  return url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps');
};

export const extractCoordinates = (googleMapsUrl: string) => {
  // Sucht nach dem Muster @Breitengrad,Längengrad oder !3dBreitengrad!4dLängengrad
  // Google Maps Links können Koordinaten in verschiedenen Formaten enthalten
  const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const matchAt = googleMapsUrl.match(regexAt);

  if (matchAt) {
    return {
      lat: matchAt[1],
      lng: matchAt[2]
    };
  }

  // Fallback für !3d...!4d Format (oft in Embed-Links oder geteilten Links)
  const regexBang = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
  const matchBang = googleMapsUrl.match(regexBang);
  if (matchBang) {
    return {
      lat: matchBang[1],
      lng: matchBang[2]
    };
  }

  // Fallback für q=lat,lng Format
  const regexQ = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
  const matchQ = googleMapsUrl.match(regexQ);
  if (matchQ) {
    return {
      lat: matchQ[1],
      lng: matchQ[2]
    };
  }

  return null; // Falls keine Koordinaten gefunden wurden
};

export const getMobileOperatingSystem = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // iOS Erkennung
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'iOS';
  }
  // Android Erkennung
  if (/android/i.test(userAgent)) {
    return 'Android';
  }
  return 'unknown';
};

export const openLocationInApp = (googleMapsUrl: string) => {
  const coords = extractCoordinates(googleMapsUrl);
  const os = getMobileOperatingSystem();

  // Fallback: Wenn wir keine Koordinaten extrahieren können, 
  // öffnen wir einfach den originalen Google Maps Link im Browser.
  if (!coords) {
    window.open(googleMapsUrl, '_blank');
    return;
  }

  const { lat, lng } = coords;

  if (os === 'iOS') {
    // Öffnet Apple Maps mit Pin an den Koordinaten
    window.location.href = `maps://?ll=${lat},${lng}&q=${lat},${lng}`;
  } else if (os === 'Android') {
    // Öffnet Google Maps App (oder Auswahlmenü auf Android)
    window.location.href = `geo:${lat},${lng}?q=${lat},${lng}`;
  } else {
    // Desktop: Öffne den originalen Link in einem neuen Tab
    window.open(googleMapsUrl, '_blank');
  }
};
