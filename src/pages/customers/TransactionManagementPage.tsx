import React, { FC, useState } from 'react';
import { Customer, View, User, Transaction } from '../../types';
import Icon from '../../components/ui/Icon';
import TransactionConfirmationModal from '../../components/modals/TransactionConfirmationModal';
import { StripePaymentModal } from '../../components/modals/StripePaymentModal';
import { apiClient } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface TransactionManagementPageProps {
    customer: Customer;
    setView: (view: View) => void;
    onConfirmTransaction: (tx: any) => void;
    currentUser: User;
    services?: any[]; // Wird von App.tsx übergeben
    balanceConfig?: {
        allow_custom_top_up: boolean;
        top_up_options: { amount: number; bonus: number }[];
    };
    authToken: string | null;
    fetchAppData: () => Promise<void>;
    initialDogId?: number; // NEU
}

const TransactionManagementPage: FC<TransactionManagementPageProps> = ({
    customer, setView, onConfirmTransaction, currentUser, services, balanceConfig, authToken, fetchAppData, initialDogId
}) => {
    const [modalData, setModalData] = useState<any>(null);
    const [customTopup, setCustomTopup] = useState('');
    const [customDebitAmount, setCustomDebitAmount] = useState('');
    const [customDebitDesc, setCustomDebitDesc] = useState('');
    const [stripeModalData, setStripeModalData] = useState<{ clientSecret: string; amount: number; bonus: number } | null>(null);
    const [isCreatingIntent, setIsCreatingIntent] = useState(false);

    // NEU: Aktiver Hund aus der Detailseite bestimmen
    const dogs = customer.dogs || [];
    // Wir nehmen an App.tsx kann uns den activeDogId übergeben oder wir finden ihn über die URL/State
    // Da wir aber in TransactionManagementPage oft direkt kommen, nehmen wir den ersten Hund als Default oder erlauben Auswahl
    const [activeDogId, setActiveDogId] = useState<number | null>(() => {
        if (initialDogId) return initialDogId;
        return dogs.length > 0 ? dogs[0].id : null;
    });
    const activeDog = dogs.find(d => d.id === activeDogId);

    const isCustomer = currentUser.role === 'customer' || currentUser.role === 'kunde';

    // FIX: Dynamische Auflade-Optionen aus Config
    let topups = (balanceConfig?.top_up_options && balanceConfig.top_up_options.length > 0)
        ? balanceConfig.top_up_options.map(opt => ({
            title: `Aufladung ${opt.amount}€`,
            amount: opt.amount,
            bonus: opt.bonus
        }))
        : [
            // Fallback, falls keine Config existiert
            { title: 'Aufladung 50€', amount: 50, bonus: 5 },
            { title: 'Aufladung 100€', amount: 100, bonus: 15 },
        ];

    // Filter für Kunden: Nur Optionen mit Bonus anzeigen
    if (isCustomer) {
        topups = topups.filter(t => t.bonus > 0);
    }

    // FIX: Dynamische Leistungen aus DB (TrainingTypes)
    const debits = (services && services.length > 0)
        ? services.map(s => ({
            title: s.name,
            amount: -Math.abs(s.default_price || s.price || 0),
            reqId: s.id // ID nutzen für Level-Tracking
        }))
        : [];

    const handleTxClick = async (data: any) => {
        if (data.bonus !== undefined) {
            const totalAmount = data.amount + data.bonus;

            if (isCustomer) {
                // Stripe Flow für Kunden
                setIsCreatingIntent(true);
                try {
                    const response = await apiClient.createTopUpIntent({
                        amount: data.amount,
                        bonus: data.bonus
                    }, authToken);
                    setStripeModalData({
                        clientSecret: response.clientSecret,
                        amount: data.amount,
                        bonus: data.bonus
                    });
                } catch (error) {
                    console.error("Stripe Intent Error:", error);
                    alert("Konnte Bezahlvorgang nicht starten. Bitte versuche es später erneut.");
                } finally {
                    setIsCreatingIntent(false);
                }
            } else {
                // Admin Flow (direkte Buchung)
                setModalData({
                    title: data.title,
                    amount: totalAmount,
                    type: 'topup',
                    baseAmount: data.amount,
                    bonus: data.bonus
                });
            }
        } else {
            setModalData({
                title: data.title,
                amount: data.amount,
                type: 'debit',
                meta: { requirementId: data.reqId },
                dogId: activeDogId, // NEU
                dogName: activeDog?.name // NEU
            });
        }
    };

    const handleCustomTopup = () => {
        const amount = parseFloat(customTopup);
        if (!amount || amount <= 0) return alert("Ungültiger Betrag");

        // Optional: Client-Side Bonus Berechnung für Custom Amounts
        let bonus = 0;
        if (balanceConfig?.top_up_options) {
            const sortedOpts = [...balanceConfig.top_up_options].sort((a, b) => b.amount - a.amount);
            const match = sortedOpts.find(opt => amount >= opt.amount);
            if (match) bonus = match.bonus;
        }

        setModalData({ title: `Individuelle Aufladung`, amount: amount + bonus, type: 'topup', baseAmount: amount, bonus: bonus });
        setCustomTopup('');
    };

    const handleCustomDebit = () => {
        const amount = parseFloat(customDebitAmount);
        if (!amount || amount <= 0 || !customDebitDesc) return alert("Bitte alle Felder ausfüllen");
        setModalData({ title: customDebitDesc, amount: -amount, type: 'debit' });
        setCustomDebitAmount('');
        setCustomDebitDesc('');
    };

    return (
        <>
            <header className="detail-header">
                <button className="back-button" onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: customer.auth_id || String(customer.id), dogId: activeDogId || undefined })}>
                    <Icon name="arrowLeft" />
                </button>
                <div className="detail-header-info">
                    <h1>{isCustomer ? 'Guthaben aufladen' : 'Transaktionen verwalten'}</h1>
                    <p>für {customer.name}</p>
                </div>
            </header>
            <div className="tx-header-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p>Aktuelles Guthaben</p>
                        <h2>{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</h2>
                    </div>
                    {dogs.length > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Ausgewählter Hund</p>
                            <select
                                className="form-input"
                                value={activeDogId || ''}
                                onChange={(e) => setActiveDogId(Number(e.target.value))}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem', width: 'auto' }}
                            >
                                {dogs.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="tx-section">
                <h3>Aufladungen</h3>
                <div className="tx-grid">
                    {topups.map((t, idx) => (
                        <button key={idx} className="tx-button topup" onClick={() => handleTxClick(t)}>
                            <div className="info">
                                <div className="title">{t.title}</div>
                                {t.bonus > 0 && <div className="bonus">(+ {t.bonus.toFixed(0)} € Bonus)</div>}
                            </div>
                            <div className="amount">+ {(t.amount + t.bonus).toFixed(0)} €</div>
                        </button>
                    ))}
                </div>
                {(balanceConfig?.allow_custom_top_up !== false && !isCustomer) && (
                    <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <input type="number" className="form-input" placeholder="Individuell..." value={customTopup} onChange={e => setCustomTopup(e.target.value)} />
                        <button className="button button-primary" onClick={handleCustomTopup}>Aufladen</button>
                    </div>
                )}
            </div>

            {!isCustomer && (
                <div className="tx-section debits">
                    <h3>Leistungen</h3>
                    {debits.length > 0 ? (
                        <div className="tx-grid">
                            {debits.map((d, idx) => (
                                <button key={idx} className="tx-button debit" onClick={() => handleTxClick(d)} disabled={customer.balance + d.amount < 0}>
                                    <div className="info"><div className="title">{d.title}</div></div>
                                    <div className="amount">{d.amount.toFixed(0)} €</div>
                                </button>
                            ))}
                        </div>
                    ) : <p className="text-gray-500 italic">Keine Leistungen konfiguriert.</p>}

                    <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <input type="text" className="form-input" placeholder="Beschreibung" style={{ flexGrow: 2 }} value={customDebitDesc} onChange={e => setCustomDebitDesc(e.target.value)} />
                        <input type="number" className="form-input" placeholder="Betrag" style={{ flexGrow: 1 }} value={customDebitAmount} onChange={e => setCustomDebitAmount(e.target.value)} />
                        <button className="button button-danger" onClick={handleCustomDebit}>Abbuchen</button>
                    </div>
                </div>
            )}

            {modalData && <TransactionConfirmationModal
                customer={customer}
                transaction={modalData}
                onClose={() => setModalData(null)}
                onConfirm={() => { onConfirmTransaction(modalData); setModalData(null); }}
                currentUser={currentUser}
            />}

            {stripeModalData && (
                <StripePaymentModal
                    isOpen={!!stripeModalData}
                    onClose={() => setStripeModalData(null)}
                    onSuccess={() => {
                        setStripeModalData(null);
                        fetchAppData(); // Daten neu laden, um Guthaben zu aktualisieren
                    }}
                    clientSecret={stripeModalData.clientSecret}
                    amount={stripeModalData.amount}
                    bonus={stripeModalData.bonus}
                />
            )}

            {isCreatingIntent && (
                <div className="modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="modal-content" style={{ maxWidth: '300px', padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Loader2 className="animate-spin" style={{ color: 'var(--brand-blue)' }} size={32} />
                        <p className="font-medium">Bereite Zahlung vor...</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default TransactionManagementPage;
