
import React, { FC, useMemo } from 'react';
import { View } from '../types';
import Icon from '../components/ui/Icon';
import KpiCard from '../components/ui/KpiCard';
import { getInitials, getAvatarColorClass } from '../lib/utils';

interface DashboardPageProps {
    customers: any[];
    transactions: any[];
    currentUser: any;
    onKpiClick: (type: string, color: string) => void;
    setView: (view: View) => void;
}

const DashboardPage: FC<DashboardPageProps> = ({ customers, transactions, currentUser, onKpiClick, setView }) => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeCustomersThisMonth = useMemo(() => {
        const activeIds = new Set(transactions.filter(t => new Date(t.date) >= startOfMonth).map(t => t.user_id));
        return customers.filter(c => activeIds.has(c.id));
    }, [customers, transactions, startOfMonth]);

    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const today = new Date().toDateString();
    const transactionsToday = transactions.filter(t => t.date && new Date(t.date).toDateString() === today).length;
    const transactionsMonth = transactions.filter(t => t.date && new Date(t.date) >= startOfMonth).length;

    return (
        <>
            <header className="page-header">
                <h1>Willkommen, {currentUser.name}!</h1>
                <p>Übersicht Ihrer Hundeschul-Wertkarten</p>
            </header>
            <div className="kpi-grid">
                <KpiCard title="Kunden gesamt" value={customers.length.toString()} icon="customers" bgIcon="customers" color="green" onClick={() => onKpiClick('allCustomers', 'green')} />
                <KpiCard title="Guthaben gesamt" value={`€ ${Math.floor(totalCredit).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="orange" onClick={() => onKpiClick('customersWithBalance', 'orange')} />
                <KpiCard title="Transaktionen Heute" value={transactionsToday.toString()} icon="creditCard" bgIcon="creditCard" color="blue" onClick={() => onKpiClick('transactionsToday', 'blue')} />
                <KpiCard title="Transaktionen Monat" value={transactionsMonth.toString()} icon="trendingUp" bgIcon="trendingUp" color="purple" onClick={() => onKpiClick('transactionsMonth', 'purple')} />
            </div>
            <div className="dashboard-bottom-grid">
                <div className="content-box">
                    <h2>Aktuelle Kunden</h2>
                    <ul className="active-customer-list">
                        {activeCustomersThisMonth.slice(0, 4).map(cust => {
                            const nameParts = cust.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');
                            return (
                                <li key={cust.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: cust.id })} className="clickable">
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
                            const customer = customers.find(c => c.id === tx.user_id);
                            return (
                                <li key={tx.id}>
                                    <div className={`icon ${tx.amount < 0 ? 'down' : 'up'}`}><Icon name="arrowDown" /></div>
                                    <div className="info">
                                        <div className="customer">{customer?.name}</div>
                                        <div className="details">{new Date(tx.date).toLocaleDateString('de-DE')} - {tx.description}</div>
                                    </div>
                                    <div className="amount">{Math.floor(tx.amount).toLocaleString('de-DE')} €</div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;
