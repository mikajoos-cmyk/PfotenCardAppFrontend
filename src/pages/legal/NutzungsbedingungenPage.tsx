import React, { FC } from 'react';
import Icon from '../../components/ui/Icon';
import { View } from '../../types';

interface LegalPageProps { setView: (view: View) => void; }

const NutzungsbedingungenPage: FC<LegalPageProps> = ({ setView }) => {
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <header className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
                <button onClick={() => setView({ page: 'dashboard' })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <Icon name="arrowLeft" />
                </button>
                <h1 className="text-lg font-bold">Nutzungsbedingungen</h1>
            </header>

            <div className="p-6 overflow-y-auto prose dark:prose-invert max-w-none">
                <h3>1. Allgemeines</h3>
                <p>
                    Die "Pfotencard App" wird dir technisch von [DEIN FIRMENNAME] zur Verfügung gestellt. Vertragspartner für trainingsbezogene Leistungen (Termine, Wertkarten) ist ausschließlich deine Hundeschule.
                </p>

                <h3>2. Kostenlose Nutzung</h3>
                <p>
                    Die Nutzung der App ist für dich als Hundehalter kostenlos.
                </p>

                <h3>3. Chat & Inhalte (Digital Services Act)</h3>
                <p>
                    Du darfst über die Chat-Funktion keine rechtswidrigen Inhalte teilen.
                    <br />
                    <strong>Meldeverfahren:</strong> Solltest du illegale Inhalte oder Hassrede entdecken, kannst du diese direkt an <em>abuse@pfotencard.de</em> melden. Wir prüfen Meldungen unverzüglich und sperren betroffene Inhalte oder Nutzerkonten bei Verstößen.
                </p>

                <h3>4. Verfügbarkeit</h3>
                <p>
                    Wir bemühen uns um eine ständige Verfügbarkeit der App, können Ausfälle durch Wartungsarbeiten oder technische Störungen jedoch nicht ausschließen.
                </p>

                <h3>5. Haftung</h3>
                <p>
                    Wir haften nicht für die Richtigkeit der Trainingsinhalte deiner Hundeschule. Für technische Mängel haften wir nur bei Vorsatz oder grober Fahrlässigkeit.
                </p>
            </div>
        </div>
    );
};

export default NutzungsbedingungenPage;