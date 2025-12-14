
import React, { FC, useState } from 'react';
import { Customer, View, User, Transaction } from '../../types';
import Icon from '../../components/ui/Icon';
import ConfirmationModal from '../../components/modals/ConfirmationModal';

interface TransactionManagementPageProps {
    customer: Customer;
    setView: (view: View) => void;
    onConfirmTransaction: (tx: any) => void;
    currentUser: User;
}

const TransactionManagementPage: FC<TransactionManagementPageProps> = ({ customer, setView, onConfirmTransaction, currentUser }) => {
    const [modalData, setModalData] = useState<(Omit<Transaction, 'id' | 'createdAt' | 'customerId' | 'createdBy'> & { baseAmount?: number, bonus?: number }) | null>(null);

    const [customTopup, setCustomTopup] = useState('');
    const [customDebitAmount, setCustomDebitAmount] = useState('');
    const [customDebitDesc, setCustomDebitDesc] = useState('');

    const topups = [
        { title: 'Aufladung 50€', amount: 50, bonus: 5 },
        { title: 'Aufladung 100€', amount: 100, bonus: 15 },
        { title: 'Aufladung 150€', amount: 150, bonus: 30 },
        { title: 'Aufladung 300€', amount: 300, bonus: 150 },
    ];

    const debits = [
        { title: 'Gruppenstunde', amount: -15, reqId: 'group_class' },
        { title: 'Trail', amount: -18, reqId: 'trail' },
        { title: 'Prüfungsstunde', amount: -15, reqId: 'exam' },
        { title: 'Social Walk', amount: -15, reqId: 'social_walk' },
        { title: 'Wirtshaustraining', amount: -15, reqId: 'tavern_training' },
        { title: 'Erste Hilfe Kurs', amount: -50, reqId: 'first_aid' },
        { title: 'Vortrag Bindung & Beziehung', amount: -15, reqId: 'lecture_bonding' },
        { title: 'Vortrag Jagdverhalten', amount: -15, reqId: 'lecture_hunting' },
        { title: 'WS Kommunikation & Körpersprache', amount: -15, reqId: 'ws_communication' },
        { title: 'WS Stress & Impulskontrolle', amount: -15, reqId: 'ws_stress' },
        { title: 'Theorieabend Hundeführerschein', amount: -25, reqId: 'theory_license' },
    ];

    const handleTxClick = (data: { title: string, amount: number, bonus?: number, reqId?: string }) => {
        if (data.bonus !== undefined) {
            const totalAmount = data.amount + data.bonus;
            setModalData({ title: data.title, amount: totalAmount, type: 'topup', baseAmount: data.amount, bonus: data.bonus } as any);
        } else {
            setModalData({ title: data.title, amount: data.amount, type: 'debit', meta: { requirementId: data.reqId } } as any);
        }
    };

    const handleCustomTopup = () => {
        const amount = parseFloat(customTopup);
        if (!amount || amount <= 0) {
            alert("Bitte geben Sie einen gültigen Betrag ein.");
            return;
        }
        let bonus = 0;
        if (amount >= 300) { bonus = 150 }
        else if (amount >= 150) { bonus = 30 }
        else if (amount >= 100) { bonus = 15 }
        else if (amount >= 50) { bonus = 5 }
        setModalData({ title: `Individuelle Aufladung`, amount: amount + bonus, type: 'topup', baseAmount: amount, bonus: bonus } as any);
        setCustomTopup('');
    };

    const handleCustomDebit = () => {
        const amount = parseFloat(customDebitAmount);
        if (!amount || amount <= 0 || !customDebitDesc) {
            alert("Bitte geben Sie einen gültigen Betrag und eine Beschreibung ein.");
            return;
        }
        setModalData({ title: customDebitDesc, amount: -amount, type: 'debit' } as any);
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
                    {topups.map(t => (
                        <button key={t.amount} className="tx-button topup" onClick={() => handleTxClick(t)}>
                            <div className="info">
                                <div className="title">{t.title}</div>
                                {t.bonus > 0 && <div className="bonus">(+ {t.bonus.toFixed(0)} € Bonus)</div>}
                            </div>
                            <div className="amount">+ {(t.amount + t.bonus).toFixed(0)} €</div>
                        </button>
                    ))}
                </div>
                <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="number"
                        className="form-input"
                        placeholder="Individueller Betrag"
                        value={customTopup}
                        onChange={e => setCustomTopup(e.target.value)}
                    />
                    <button className="button button-primary" onClick={handleCustomTopup}>Aufladen</button>
                </div>
            </div>

            <div className="tx-section debits">
                <h3>Abbuchungen (Training & Kurse)</h3>
                <div className="tx-grid">
                    {debits.map(d => (
                        <button key={d.title} className="tx-button debit" onClick={() => handleTxClick(d)} disabled={customer.balance + d.amount < 0}>
                            <div className="info"><div className="title">{d.title}</div></div>
                            <div className="amount">{d.amount.toFixed(0)} €</div>
                        </button>
                    ))}
                </div>
                <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input type="text" className="form-input" placeholder="Beschreibung (z.B. 'Sonder-Event')" style={{ flexGrow: 2 }} value={customDebitDesc} onChange={e => setCustomDebitDesc(e.target.value)} />
                    <input type="number" className="form-input" placeholder="Betrag" style={{ flexGrow: 1 }} value={customDebitAmount} onChange={e => setCustomDebitAmount(e.target.value)} />
                    <button className="button button-danger" onClick={handleCustomDebit}>Abbuchen</button>
                </div>
            </div>

            {modalData && <ConfirmationModal
                title={modalData.amount >= 0 ? "Aufladung bestätigen" : "Abbuchung bestätigen"}
                message={`Möchten Sie die Transaktion "${modalData.title}" über ${Math.abs(modalData.amount).toLocaleString('de-DE')} € wirklich durchführen?`}
                onConfirm={() => { onConfirmTransaction(modalData); setModalData(null); }}
                onCancel={() => setModalData(null)}
                confirmText={modalData.amount >= 0 ? "Aufladen" : "Abbuchen"}
                isDestructive={modalData.amount < 0}
            />}
        </>
    );
};

export default TransactionManagementPage;
