import React, { FC } from 'react';
import Icon from '../../components/ui/Icon';
import { View } from '../../types';

interface LegalPageProps { setView: (view: View) => void; }

export function DatenschutzPage({ setView }: LegalPageProps) {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <header className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
                <button onClick={() => setView({ page: 'dashboard' })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <Icon name="arrowLeft" />
                </button>
                <h1 className="text-lg font-bold">Datenschutz</h1>
            </header>

            <div className="p-6 overflow-y-auto prose dark:prose-invert max-w-none">
                <p className="text-sm text-gray-500">Stand: Januar 2026</p>

                <h3>1. Wer ist verantwortlich?</h3>
                <p>
                    Verantwortlicher für deine Trainingsdaten ist <strong>deine Hundeschule</strong>.
                    Wir ([DEIN NAME], "Pfotencard") sind technischer Auftragsverarbeiter. Wir verarbeiten Daten nur im Auftrag deiner Hundeschule sicher auf unseren Servern.
                </p>

                <h3>2. Wo liegen die Daten? (Serverstandort)</h3>
                <p>
                    Unsere Server (Vercel, Supabase) befinden sich vorrangig in <strong>Frankfurt (Deutschland)</strong>.
                    Backups werden verschlüsselt in der EU gespeichert.
                </p>

                <h3>3. Drittanbieter & USA-Transfers (DPF)</h3>
                <p>
                    Für bestimmte Funktionen (Login, Push-Nachrichten) nutzen wir Dienstleister, die ihren Sitz in den USA haben könnten (z.B. AWS als Unterauftragnehmer von Supabase).
                    <br /><br />
                    <strong>Datenschutz-Garantie:</strong> Wir nutzen ausschließlich Anbieter, die nach dem <em>EU-US Data Privacy Framework (DPF)</em> zertifiziert sind oder mit denen EU-Standardvertragsklauseln (SCC) vereinbart wurden, um ein angemessenes Datenschutzniveau sicherzustellen.
                </p>

                <h3>4. Deine Rechte</h3>
                <p>
                    Du kannst jederzeit die Löschung deines Accounts bei deiner Hundeschule oder direkt in der App beantragen (Account löschen).
                </p>
            </div>
        </div>
    );
};

