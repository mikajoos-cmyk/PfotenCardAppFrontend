export const HELP_CONTENT: Record<string, { title: string, text: string }> = {
    // --- DASHBOARD ---
    dashboard: {
        title: "Dashboard Übersicht",
        text: "Das Dashboard gibt dir einen schnellen Überblick über deine Hundeschule. Die oberen Kacheln zeigen wichtige Kennzahlen – klicke darauf, um Details wie Kundenlisten oder Tagesumsätze zu sehen. Unten findest du Schnellzugriffe auf aktive Kunden und die letzten Buchungen."
    },

    // --- KUNDEN ---
    customers: {
        title: "Kundenliste",
        text: "Hier verwaltest du deine Kundenkartei. Nutze die Buchstaben-Filter oben, um schnell nach Nachnamen zu suchen. Ein Klick auf einen Kunden öffnet die detaillierte Kundenakte. Die Liste zeigt dir auf einen Blick den aktuellen Guthabenstand und das Level jedes Kunden."
    },
    customers_detail: {
        title: "Kundenakte",
        text: "Hier siehst du alle Details zu einem Kunden. Du kannst Stammdaten bearbeiten, Dokumente (z.B. Impfpass) hochladen und den Level-Fortschritt einsehen. Über die Buttons oben rechts kannst du Guthaben verwalten, den VIP-Status ändern oder den Kunden löschen."
    },
    customers_transactions: {
        title: "Guthaben & Buchen",
        text: "Buche hier Leistungen oder lade Guthaben auf. Wähle eine der Schnellvorlagen (z.B. 'Gruppenstunde') oder gib unten einen individuellen Betrag ein. Bei Aufladungen wird der Bonus automatisch gemäß deinen Einstellungen berechnet."
    },

    // --- TERMINE ---
    appointments: {
        title: "Terminplaner",
        text: "Verwalte deine Kurse und Veranstaltungen. Als Admin kannst du hier neue Termine erstellen (+ Button). Klicke auf einen Termin, um die Teilnehmerliste zu sehen, Anwesenheiten abuhaken oder Nachrichten an alle Teilnehmer zu senden."
    },

    // --- BERICHTE ---
    reports: {
        title: "Finanzen & Berichte",
        text: "Analysiere deine Umsätze. Du kannst nach Monat/Jahr und Mitarbeiter filtern. Wichtig: 'Echte Einnahmen' zeigen den Geldfluss ohne Bonus-Guthaben. Nutze die Export-Funktionen (PDF/CSV) oben rechts für deine Buchhaltung oder den Steuerberater."
    },

    // --- BENUTZER (ADMIN) ---
    users: {
        title: "Mitarbeiter verwalten",
        text: "Hier legst du Zugänge für dein Team an. 'Admins' haben Vollzugriff (inkl. Einstellungen & Finanzen), 'Mitarbeiter' können das Tagesgeschäft erledigen (Kunden verwalten, buchen), sehen aber keine sensiblen Umsatzzahlen anderer."
    },

    // --- NEWS ---
    news: {
        title: "Neuigkeiten",
        text: "Erstelle Ankündigungen für deine Kunden. Du kannst Beiträge mit Bildern versehen und entscheiden, wer sie sehen soll: Alle Kunden, nur bestimmte Level-Gruppen oder Teilnehmer spezieller Kurse."
    },

    // --- CHAT ---
    chat: {
        title: "Nachrichten",
        text: "Kommuniziere direkt und DSGVO-konform mit deinen Kunden. Du kannst Textnachrichten, Bilder und Dokumente versenden. Auf dem Desktop siehst du links die Liste aller Konversationen, mobil wechselst du über den 'Zurück'-Pfeil."
    },

    // --- KUNDEN-ANSICHTEN (APP) ---
    transactions: {
        title: "Transaktionsverlauf",
        text: "Hier sehen Kunden ihre vollständige Historie: Wann wurde Guthaben aufgeladen, wie viel Bonus gab es und welche Kurse wurden wann abgebucht."
    },

    // --- RECHTLICHES ---
    impressum: {
        title: "Impressum",
        text: "Rechtliche Anbieterkennzeichnung der App und der Hundeschule."
    },
    datenschutz: {
        title: "Datenschutz",
        text: "Informationen zur Verarbeitung personenbezogener Daten in dieser App."
    },
    agb: {
        title: "AGB",
        text: "Allgemeine Geschäfts- und Nutzungsbedingungen der Pfotencard App."
    }
};