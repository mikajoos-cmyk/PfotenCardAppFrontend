
import React, { FC } from 'react';
import Icon from '../../components/ui/Icon';

interface CustomerTransactionsPageProps {
    transactions: any[];
}

const CustomerTransactionsPage: FC<CustomerTransactionsPageProps> = ({ transactions }) => {
    return (
        <>
            <header className="page-header">
                <h1>Meine Transaktionen</h1>
                <p>Hier sehen Sie eine Übersicht aller Ihrer Buchungen.</p>
            </header>
            <div className="content-box">
                <ul className="detailed-transaction-list">
                    {transactions.length > 0 ? (
                        transactions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(tx => (
                                <li key={tx.id}>
                                    <div className={`tx-icon ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        <Icon name={tx.amount < 0 ? 'arrowDown' : 'trendingUp'} />
                                    </div>
                                    <div className="tx-details">
                                        <div className="tx-line-1">
                                            <span className="tx-title">{tx.description}</span>
                                        </div>
                                        <div className="tx-line-2">
                                            <span>{new Date(tx.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        {tx.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                </li>
                            ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                            Sie haben noch keine Transaktionen.
                        </p>
                    )}
                </ul>
            </div>
        </>
    );
};

export default CustomerTransactionsPage;
