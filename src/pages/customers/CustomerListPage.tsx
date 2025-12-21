
import React, { FC, useState, useMemo } from 'react';
import { Customer, Transaction, View } from '../../types';
import { LEVELS } from '../../lib/constants';
import { getInitials, getAvatarColorClass } from '../../lib/utils';
import KpiCard from '../../components/ui/KpiCard';

interface CustomerListPageProps {
    customers: Customer[];
    transactions: Transaction[];
    setView: (view: View) => void;
    onKpiClick: (type: string, color: string) => void;
    onAddCustomerClick: () => void;
    currentUser: any;
}

const CustomerListPage: FC<CustomerListPageProps> = ({ customers, transactions, setView, onKpiClick, onAddCustomerClick, currentUser }) => {
    const [filterLetter, setFilterLetter] = useState('Alle');

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeCustomersCount = useMemo(() => new Set(transactions.filter(tx => new Date(tx.date as any) >= startOfMonth).map(tx => tx.user_id)).size, [transactions, startOfMonth]);
    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const transactionsMonthCount = transactions.filter(tx => new Date(tx.date as any) >= startOfMonth).length;

    const filteredCustomers = useMemo(() => {
        if (filterLetter === 'Alle') return customers;
        return customers.filter(c => {
            if (!c.name) return false;
            const nameParts = c.name.split(' ');
            const lastName = nameParts[nameParts.length - 1];
            return lastName.toUpperCase().startsWith(filterLetter);
        });
    }, [customers, filterLetter]);

    return (
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Kundenverwaltung</h1>
                    <p>Verwalten Sie alle Ihre Kunden an einem Ort</p>
                </div>
            </header>
            <div className="kpi-grid">
                <KpiCard title="Kunden Gesamt" value={customers.length.toString()} icon="customers" bgIcon="customers" color="green" onClick={() => onKpiClick('allCustomers', 'green')} />
                <KpiCard title="Aktiv" value={activeCustomersCount.toString()} icon="heart" bgIcon="heart" color="orange" onClick={() => onKpiClick('activeCustomersMonth', 'orange')} />
                <KpiCard title="Guthaben" value={`€ ${Math.floor(totalCredit).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="blue" onClick={() => onKpiClick('customersWithBalance', 'blue')} />
                <KpiCard title="Transaktionen Monat" value={transactionsMonthCount.toString()} icon="trendingUp" bgIcon="trendingUp" color="purple" onClick={() => onKpiClick('transactionsMonth', 'purple')} />
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
                        <tr><th>Kunde</th><th>Hund</th><th>Guthaben</th><th>Level</th><th>Erstellt</th><th></th></tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => {
                            const level = LEVELS.find(l => l.id === customer.level_id);
                            const nameParts = customer.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');

                            return (
                                <tr key={customer.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: String(customer.id) })}>
                                    <td data-label="Kunde">
                                        <div className="customer-info">
                                            <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                                {getInitials(firstName, lastName)}
                                            </div>
                                            <div>
                                                <div className="name">{firstName} {lastName}</div>
                                                <div className="id">ID: {customer.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Hund">{customer.dogs[0]?.name || '-'}</td>
                                    <td data-label="Guthaben">€ {Math.floor(customer.balance).toLocaleString('de-DE')}</td>
                                    <td data-label="Level"><span className="level-badge">{level?.name}</span></td>
                                    <td data-label="Erstellt">{new Date(customer.customer_since as any).toLocaleDateString('de-DE')}</td>
                                    <td data-label="Aktion">&gt;</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default CustomerListPage;
