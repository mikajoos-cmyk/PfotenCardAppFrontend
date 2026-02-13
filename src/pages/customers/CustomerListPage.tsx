import React, { FC, useState, useMemo } from 'react';
import { Customer, Transaction, View } from '../../types';
import { LEVELS } from '../../lib/constants';
import { getInitials, getAvatarColorClass, getLevelColor } from '../../lib/utils';
import KpiCard from '../../components/ui/KpiCard';
import InfoModal from '../../components/modals/InfoModal'; // Importieren

interface CustomerListPageProps {
    customers: Customer[];
    transactions: Transaction[];
    setView: (view: View) => void;
    onKpiClick: (type: string, color: string) => void;
    onAddCustomerClick: () => void;
    currentUser: any;
    levels?: any[];
    wording?: any;
}

const CustomerListPage: FC<CustomerListPageProps> = ({ customers, transactions, setView, onKpiClick, onAddCustomerClick, currentUser, levels, wording }) => {
    const [filterLetter, setFilterLetter] = useState('Alle');
    const levelTerm = wording?.level || 'Level';

    // State für das Modal
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({
        isOpen: false, title: '', content: null, color: 'blue'
    });

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Daten vorbereiten
    const activeCustomersList = useMemo(() => {
        const activeIds = new Set(transactions.filter(tx => new Date(tx.date as any) >= startOfMonth).map(tx => tx.user_id));
        return customers.filter(c => activeIds.has(c.id));
    }, [customers, transactions, startOfMonth]);

    const totalCredit = customers.reduce((sum, cust) => sum + (cust.balance ?? 0), 0);
    const transactionsMonthList = transactions.filter(tx => new Date(tx.date as any) >= startOfMonth);

    const filteredCustomers = useMemo(() => {
        if (filterLetter === 'Alle') return customers;
        return customers.filter(c => {
            if (!c.name) return false;
            const nameParts = c.name.split(' ');
            const lastName = nameParts[nameParts.length - 1];
            return lastName.toUpperCase().startsWith(filterLetter);
        });
    }, [customers, filterLetter]);

    // --- KPI Handler ---
    const handleKpiDetail = (type: 'all' | 'active' | 'credit' | 'tx_month', color: string) => {
        let title = '';
        let content: React.ReactNode = null;

        const renderCustomerList = (list: any[]) => (
            <ul className="info-modal-list">
                {list.length > 0 ? list.map(c => (
                    <li key={c.id} onClick={() => { setModal({ ...modal, isOpen: false }); setView({ page: 'customers', subPage: 'detail', customerId: c.auth_id || String(c.id) }); }} style={{ cursor: 'pointer' }}>
                        <span>{c.name} ({c.dogs?.[0]?.name || '-'})</span>
                        <span style={{ fontWeight: 600 }}>€ {(c.balance ?? 0).toLocaleString('de-DE')}</span>
                    </li>
                )) : <p className="text-gray-500 italic">Keine Daten.</p>}
            </ul>
        );

        const renderTxList = (list: any[]) => (
            <ul className="info-modal-list">
                {list.length > 0 ? list.map(tx => {
                    const customer = customers.find(c => String(c.id) === String(tx.user_id));
                    return (
                        <li key={tx.id}>
                            <span>{new Date(tx.date as any).toLocaleDateString('de-DE')} - {tx.description?.split(' (Termin-ID:')[0]} <span className="text-gray-500">({customer?.name || 'Unbekannt'})</span></span>
                            <span style={{ fontWeight: 600, color: tx.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)' }}>
                                € {(Math.abs(tx.amount) ?? 0).toLocaleString('de-DE')}
                            </span>
                        </li>
                    );
                }) : <p className="text-gray-500 italic">Keine Transaktionen diesen Monat.</p>}
            </ul>
        );

        switch (type) {
            case 'all':
                title = `Alle Kunden (${customers.length})`;
                content = renderCustomerList(customers);
                break;
            case 'active':
                title = `Aktive Kunden im Monat (${activeCustomersList.length})`;
                content = renderCustomerList(activeCustomersList);
                break;
            case 'credit':
                title = `Kunden mit Guthaben`;
                content = renderCustomerList(customers.filter(c => c.balance > 0));
                break;
            case 'tx_month':
                title = `Transaktionen im Monat (${transactionsMonthList.length})`;
                content = renderTxList(transactionsMonthList);
                break;
        }

        setModal({ isOpen: true, title, content, color });
    };

    return (
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Kundenverwaltung</h1>
                    <p>Verwalten Sie alle Ihre Kunden an einem Ort</p>
                </div>
                {/* Neuer Kunde Button wird hier von App.tsx gesteuert über onAddCustomerClick, wir rendern ihn nicht hier direkt, oder doch? 
                    In App.tsx wird er als Prop übergeben, aber im Layout oben nicht genutzt. 
                    Ich lasse es so wie es war, um nichts kaputt zu machen. */}
            </header>

            <div className="kpi-grid">
                <KpiCard
                    title="Kunden Gesamt"
                    value={customers.length.toString()}
                    icon="customers" bgIcon="customers" color="green"
                    onClick={() => handleKpiDetail('all', 'green')}
                />
                <KpiCard
                    title="Aktiv"
                    value={activeCustomersList.length.toString()}
                    icon="heart" bgIcon="heart" color="orange"
                    onClick={() => handleKpiDetail('active', 'orange')}
                />
                <KpiCard
                    title="Guthaben"
                    value={`€ ${(totalCredit ?? 0).toLocaleString('de-DE')}`}
                    icon="creditCard" bgIcon="creditCard" color="blue"
                    onClick={() => handleKpiDetail('credit', 'blue')}
                />
                <KpiCard
                    title="Transaktionen Monat"
                    value={transactionsMonthList.length.toString()}
                    icon="trendingUp" bgIcon="trendingUp" color="purple"
                    onClick={() => handleKpiDetail('tx_month', 'purple')}
                />
            </div>

            <div className="filter-bar">
                {'Alle,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z'.split(',').map(letter => (
                    <button key={letter} className={filterLetter === letter ? 'active' : ''} onClick={() => setFilterLetter(letter)}>{letter}</button>
                ))}
            </div>
            <div className="content-box customer-list">
                <h2>Kundenliste ({filteredCustomers.length})</h2>
                <table>
                    <thead>
                        <tr><th>Kunde</th><th>Hund</th><th>Guthaben</th><th>{levelTerm}</th><th>Erstellt</th><th></th></tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => {
                            const levelsToUse = levels || LEVELS;
                            const levelId = customer.level_id || customer.current_level_id;
                            const level = levelsToUse.find(l => l.id === levelId);
                            const levelColor = getLevelColor(levelId, levelsToUse);
                            
                            const nameParts = customer.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');

                            return (
                                <tr key={customer.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: customer.auth_id || String(customer.id) })}>
                                    <td data-label="Kunde">
                                        <div className="customer-info">
                                            <div 
                                                className={`initials-avatar ${!levelColor ? getAvatarColorClass(firstName) : ''}`}
                                                style={levelColor ? { backgroundColor: levelColor, color: 'white' } : {}}
                                            >
                                                {getInitials(firstName, lastName)}
                                            </div>
                                            <div>
                                                <div className="name">{firstName} {lastName}</div>
                                                <div className="id" title={customer.auth_id}>ID: {customer.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Hund">{customer.dogs?.[0]?.name || '-'}</td>
                                    <td data-label="Guthaben">€ {(customer.balance ?? 0).toLocaleString('de-DE')}</td>
                                    <td data-label={levelTerm}>
                                        <span 
                                            className="level-badge"
                                            style={levelColor ? { backgroundColor: levelColor, color: 'white' } : {}}
                                        >
                                            {level?.name || '-'}
                                        </span>
                                    </td>
                                    <td data-label="Erstellt">{new Date(customer.customer_since as any).toLocaleDateString('de-DE')}</td>
                                    <td data-label="Aktion">&gt;</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
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

export default CustomerListPage;