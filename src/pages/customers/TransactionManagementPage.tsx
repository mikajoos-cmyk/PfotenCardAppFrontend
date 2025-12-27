import React, { FC, useState } from 'react';
import { Customer, View, User, Transaction } from '../../types';
import Icon from '../../components/ui/Icon';
import TransactionConfirmationModal from '../../components/modals/TransactionConfirmationModal';

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
}

const TransactionManagementPage: FC<TransactionManagementPageProps> = ({
    customer, setView, onConfirmTransaction, currentUser, services, balanceConfig
}) => {
    const [modalData, setModalData] = useState<any>(null);
    const [customTopup, setCustomTopup] = useState('');
    const [customDebitAmount, setCustomDebitAmount] = useState('');
    const [customDebitDesc, setCustomDebitDesc] = useState('');

    // FIX: Dynamische Auflade-Optionen aus Config
    const topups = (balanceConfig?.top_up_options && balanceConfig.top_up_options.length > 0)
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

    // FIX: Dynamische Leistungen aus DB (TrainingTypes)
    const debits = (services && services.length > 0)
        ? services.map(s => ({
            title: s.name,
            amount: -Math.abs(s.default_price || s.price || 0),
            reqId: s.id // ID nutzen für Level-Tracking
        }))
        : [];

    const handleTxClick = (data: any) => {
        if (data.bonus !== undefined) {
            const totalAmount = data.amount + data.bonus;
            setModalData({
                title: data.title,
                amount: totalAmount,
                type: 'topup',
                baseAmount: data.amount,
                bonus: data.bonus
            });
        } else {
            setModalData({
                title: data.title,
                amount: data.amount,
                type: 'debit',
                meta: { requirementId: data.reqId }
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
                <button className="back-button" onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: String(customer.id) })}>
                    <Icon name="arrowLeft" />
                </button>
                <div className="detail-header-info">
                    <h1>Transaktionen verwalten</h1>
                    <p>für {customer.name}</p>
                </div>
            </header>
            <div className="tx-header-card">
                <p>Aktuelles Guthaben</p>
                <h2>{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</h2>
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
                {(balanceConfig?.allow_custom_top_up !== false) && (
                    <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <input type="number" className="form-input" placeholder="Individuell..." value={customTopup} onChange={e => setCustomTopup(e.target.value)} />
                        <button className="button button-primary" onClick={handleCustomTopup}>Aufladen</button>
                    </div>
                )}
            </div>

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

            {modalData && <TransactionConfirmationModal
                customer={customer}
                transaction={modalData}
                onClose={() => setModalData(null)}
                onConfirm={() => { onConfirmTransaction(modalData); setModalData(null); }}
                currentUser={currentUser}
            />}
        </>
    );
};

export default TransactionManagementPage;
