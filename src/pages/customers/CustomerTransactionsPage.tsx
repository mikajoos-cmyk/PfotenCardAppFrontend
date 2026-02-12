
import React, { FC } from 'react';
import Icon from '../../components/ui/Icon';

import { apiClient } from '../../lib/api';

interface CustomerTransactionsPageProps {
    transactions: any[];
    token: string | null;
    activeModules?: string[]; // NEU
}

const CustomerTransactionsPage: FC<CustomerTransactionsPageProps> = ({ transactions, token, activeModules }) => {

    const handleDownloadInvoice = async (transactionId: number, invoiceNumber: string) => {
        if (!token) return;
        try {
            const result = await apiClient.downloadInvoice(transactionId, token);

            // Fallback für Dummy-Response (JSON)
            if (result && result.message) {
                alert(result.message);
                return;
            }

            // Blob Handling für PDF
            const url = window.URL.createObjectURL(new Blob([result]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Rechnung-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (e: any) {
            console.error("Download failed", e);
            alert("Fehler beim Herunterladen der Rechnung: " + e.message);
        }
    };

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
                                            <span className="tx-title">{tx.description?.split(' (Termin-ID:')[0]}</span>
                                        </div>
                                        <div className="tx-line-2">
                                            <span>{new Date(tx.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            {/* NEU: Rechnungs-Button bei Einnahmen mit Rechnungsnummer (nur wenn Modul aktiv) */}
                                            {tx.amount > 0 && tx.invoice_number && activeModules?.includes('invoice_download') && (
                                                <button
                                                    className="text-button small-text-button"
                                                    style={{ marginLeft: '1rem', color: 'var(--primary-color)', border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                                    onClick={() => handleDownloadInvoice(tx.id, tx.invoice_number)}
                                                    title={`Rechnung ${tx.invoice_number} herunterladen`}
                                                    aria-label={`Rechnung ${tx.invoice_number} herunterladen`}
                                                >
                                                    <Icon name="download" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        {(tx.amount < 0 ? tx.amount : tx.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                        {tx.amount > 0 && tx.bonus > 0 && (
                                            <div className="tx-bonus-tag">
                                                + {tx.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Bonus
                                            </div>
                                        )}
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
