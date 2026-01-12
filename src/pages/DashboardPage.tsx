import React, { FC, useMemo, useState } from 'react';
import { View, AppStatus } from '../types';
import LiveStatusBanner from '../components/ui/LiveStatusBanner';
import Icon from '../components/ui/Icon';
import KpiCard from '../components/ui/KpiCard';
import InfoModal from '../components/modals/InfoModal'; // Importieren
import { getInitials, getAvatarColorClass } from '../lib/utils';

interface DashboardPageProps {
    customers: any[];
    transactions: any[];
    currentUser: any;
    onKpiClick: (type: string, color: string) => void;
    setView: (view: View) => void;
    appStatus?: AppStatus | null;
}

const DashboardPage: FC<DashboardPageProps> = ({ customers, transactions, currentUser, onKpiClick, setView, appStatus }) => {
    // State für das Modal
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({
        isOpen: false, title: '', content: null, color: 'blue'
    });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const today = new Date();
    const todayString = today.toDateString();

    const activeCustomersThisMonth = useMemo(() => {
        const activeIds = new Set(transactions.filter(t => new Date(t.date) >= startOfMonth).map(t => t.user_id));
        return customers.filter(c => activeIds.has(c.id));
    }, [customers, transactions, startOfMonth]);

    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const transactionsTodayList = transactions.filter(t => t.date && new Date(t.date).toDateString() === todayString);
    const transactionsMonthList = transactions.filter(t => t.date && new Date(t.date) >= startOfMonth);

    // --- KPI Handler ---
    const handleKpiDetail = (type: 'all_customers' | 'balance' | 'tx_today' | 'tx_month', color: string) => {
        let title = '';
        let content: React.ReactNode = null;

        // Hilfsfunktion für Kundenlisten
        const renderCustomerList = (list: any[]) => (
            <ul className="info-modal-list">
                {list.map(c => (
                    <li key={c.id} onClick={() => { setModal({ ...modal, isOpen: false }); setView({ page: 'customers', subPage: 'detail', customerId: String(c.id) }); }} style={{ cursor: 'pointer' }}>
                        <span>{c.name} ({c.dogs?.[0]?.name || '-'})</span>
                        <span style={{ fontWeight: 600 }}>€ {Math.floor(c.balance).toLocaleString('de-DE')}</span>
                    </li>
                ))}
            </ul>
        );

        // Hilfsfunktion für Transaktionslisten
        const renderTxList = (list: any[]) => (
            <ul className="info-modal-list">
                {list.length > 0 ? list.map(tx => {
                    const customer = customers.find(c => String(c.id) === String(tx.user_id));
                    return (
                        <li key={tx.id}>
                            <span>{new Date(tx.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr - {tx.description} <span className="text-gray-500">({customer?.name || 'Unbekannt'})</span></span>
                            <span style={{ fontWeight: 600, color: tx.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)' }}>
                                € {Math.abs(tx.amount).toLocaleString('de-DE')}
                            </span>
                        </li>
                    );
                }) : <p className="text-gray-500 italic py-2">Keine Transaktionen gefunden.</p>}
            </ul>
        );

        switch (type) {
            case 'all_customers':
                title = `Alle Kunden (${customers.length})`;
                content = renderCustomerList(customers);
                break;
            case 'balance':
                title = `Kunden mit Guthaben`;
                // Nur Kunden mit Guthaben > 0 anzeigen
                content = renderCustomerList(customers.filter(c => c.balance > 0));
                break;
            case 'tx_today':
                title = `Transaktionen Heute (${transactionsTodayList.length})`;
                content = renderTxList(transactionsTodayList);
                break;
            case 'tx_month':
                title = `Transaktionen diesen Monat (${transactionsMonthList.length})`;
                content = renderTxList(transactionsMonthList);
                break;
        }

        setModal({ isOpen: true, title, content, color });
    };

    return (
        <>
            <header className="page-header">
                <h1>Willkommen, {currentUser.name}!</h1>
            </header>

            <LiveStatusBanner statusData={appStatus || null} />
            <div className="kpi-grid">
                <KpiCard
                    title="Kunden gesamt"
                    value={customers.length.toString()}
                    icon="customers" bgIcon="customers" color="green"
                    onClick={() => handleKpiDetail('all_customers', 'green')}
                />
                <KpiCard
                    title="Guthaben gesamt"
                    value={`€ ${Math.floor(totalCredit).toLocaleString('de-DE')}`}
                    icon="creditCard" bgIcon="creditCard" color="orange"
                    onClick={() => handleKpiDetail('balance', 'orange')}
                />
                <KpiCard
                    title="Transaktionen Heute"
                    value={transactionsTodayList.length.toString()}
                    icon="creditCard" bgIcon="creditCard" color="blue"
                    onClick={() => handleKpiDetail('tx_today', 'blue')}
                />
                <KpiCard
                    title="Transaktionen Monat"
                    value={transactionsMonthList.length.toString()}
                    icon="trendingUp" bgIcon="trendingUp" color="purple"
                    onClick={() => handleKpiDetail('tx_month', 'purple')}
                />
            </div>

            <div className="dashboard-bottom-grid">
                {/* ... (Rest der Seite bleibt gleich) ... */}
                <div className="content-box">
                    <h2>Aktuelle Kunden</h2>
                    <ul className="active-customer-list">
                        {activeCustomersThisMonth.slice(0, 4).map(cust => {
                            const nameParts = cust.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');
                            return (
                                <li key={cust.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: String(cust.id) })} className="clickable">
                                    <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                        {getInitials(firstName, lastName)}
                                    </div>
                                    <div className="info">
                                        <div className="customer-name">{firstName} {lastName}</div>
                                        <div className="dog-name">{cust.dogs[0]?.name || '-'}</div>
                                    </div>
                                    <div className="balance">{Math.floor(cust.balance).toLocaleString('de-DE')} €</div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="content-box">
                    <h2>Letzte Transaktionen</h2>
                    <ul className="transaction-list">
                        {recentTransactions.map(tx => {
                            const customer = customers.find(c => String(c.id) === String(tx.user_id));
                            return (
                                <li key={tx.id}>
                                    <div className={`icon ${tx.amount < 0 ? 'down' : 'up'}`}><Icon name="arrowDown" /></div>
                                    <div className="info">
                                        <div className="customer">{customer?.name || 'Unbekannter Kunde'}</div>
                                        <div className="details">{new Date(tx.date).toLocaleDateString('de-DE')} - {tx.description}</div>
                                    </div>
                                    <div className="amount">{Math.floor(tx.amount).toLocaleString('de-DE')} €</div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* Modal Rendern */}
            {modal.isOpen && (
                <InfoModal title={modal.title} color={modal.color} onClose={() => setModal({ ...modal, isOpen: false })}>
                    {modal.content}
                </InfoModal>
            )}
        </>
    );
};

export default DashboardPage;