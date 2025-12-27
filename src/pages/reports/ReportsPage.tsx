import React, { FC, useState, useMemo, useEffect } from 'react';
import KpiCard from '../../components/ui/KpiCard';
import Icon from '../../components/ui/Icon';
import { getInitials, getAvatarColorClass } from '../../lib/utils';
import InfoModal from '../../components/modals/InfoModal'; // Modal importieren

interface ReportsPageProps {
    transactions: any[];
    customers: any[];
    users: any[];
    currentUser: any;
    // NEU: Config für dynamische Bonus-Berechnung
    balanceConfig?: {
        allow_custom_top_up: boolean;
        top_up_options: { amount: number; bonus: number }[];
    };
}

const ReportsPage: FC<ReportsPageProps> = ({ transactions, customers, users, currentUser, balanceConfig }) => {
    const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<string>(
        currentUser.role === 'admin' ? 'all' : String(currentUser.id)
    );
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    // State für das Modal
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({
        isOpen: false, title: '', content: null, color: 'blue'
    });

    // Nutzt ausschließlich den in der Datenbank gespeicherten Bonus-Wert
    const getRealAmount = (tx: any) => {
        // Abbuchungen sind immer negativ und haben keinen Bonus
        if (tx.amount <= 0) return tx.amount;

        // Wenn ein Bonus gespeichert ist (auch 0), wird dieser abgezogen.
        // Falls das Feld fehlt (alte Daten vor der Migration), wird kein Bonus angenommen.
        if (tx.bonus !== undefined && tx.bonus !== null) {
            return tx.amount - tx.bonus;
        }

        return tx.amount;
    };

    const availablePeriods = useMemo(() => {
        const periods: { monthly: Set<string>, yearly: Set<string> } = { monthly: new Set(), yearly: new Set() };
        transactions.forEach(tx => {
            if (!tx.date) return;
            const date = new Date(tx.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            periods.monthly.add(`${year}-${month}`);
            periods.yearly.add(String(year));
        });
        return {
            monthly: Array.from(periods.monthly).sort((a, b) => b.localeCompare(a)),
            yearly: Array.from(periods.yearly).sort((a, b) => b.localeCompare(a)),
        };
    }, [transactions]);

    useEffect(() => {
        if (reportType === 'monthly' && availablePeriods.monthly.length > 0) {
            setSelectedPeriod(availablePeriods.monthly[0]);
        } else if (reportType === 'yearly' && availablePeriods.yearly.length > 0) {
            setSelectedPeriod(availablePeriods.yearly[0]);
        } else {
            setSelectedPeriod('');
        }
    }, [reportType, availablePeriods]);

    const filteredTransactions = useMemo(() => {
        if (!selectedPeriod) return [];
        return transactions.filter(tx => {
            if (!tx.date) return false;
            const txDate = new Date(tx.date);
            const year = txDate.getFullYear().toString();
            const month = `${year}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            const periodMatch = (reportType === 'yearly') ? (year === selectedPeriod) : (month === selectedPeriod);
            const mitarbeiterMatch = (selectedMitarbeiter === 'all') || (String(tx.booked_by_id) === selectedMitarbeiter);
            return periodMatch && mitarbeiterMatch;
        });
    }, [transactions, reportType, selectedPeriod, selectedMitarbeiter]);

    const revenue = filteredTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, tx) => sum + getRealAmount(tx), 0);

    const debits = filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const topCustomers = useMemo(() => {
        const customerSpending: { [key: string]: { customer: any, count: number, total: number } } = {};
        filteredTransactions.filter(tx => tx.amount < 0).forEach(tx => {
            const cust = customers.find(c => c.id === tx.user_id);
            if (!cust) return;
            const key = cust.id;
            if (!customerSpending[key]) customerSpending[key] = { customer: cust, count: 0, total: 0 };
            customerSpending[key].count++;
            customerSpending[key].total += Math.abs(tx.amount);
        });
        return Object.values(customerSpending).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [filteredTransactions, customers]);

    const formatPeriodForDisplay = (period: string, type: 'monthly' | 'yearly') => {
        if (!period) return '';
        if (type === 'yearly') return period;
        const [year, month] = period.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    };

    // --- NEU: Handler für KPI Klicks ---
    const handleKpiClick = (type: 'revenue' | 'debits' | 'transactions' | 'active_customers', color: string) => {
        let title = '';
        let content: React.ReactNode = null;
        const periodText = formatPeriodForDisplay(selectedPeriod, reportType);

        // Hilfsfunktion für Transaktionslisten
        const renderTxList = (txList: any[]) => (
            <ul className="info-modal-list">
                {txList.length > 0 ? txList.map(tx => {
                    const customer = customers.find(c => c.id === tx.user_id);
                    const realAmount = getRealAmount(tx);
                    return (
                        <li key={tx.id}>
                            <span>
                                {new Date(tx.date).toLocaleDateString('de-DE')} - {tx.description}
                                <span className="text-gray-500 text-sm"> ({customer?.name || 'Unbekannt'})</span>
                            </span>
                            <span style={{ fontWeight: 600, color: tx.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)' }}>
                                € {Math.abs(realAmount).toLocaleString('de-DE')}
                            </span>
                        </li>
                    );
                }) : <p className="text-gray-500 italic py-2">Keine Einträge vorhanden.</p>}
            </ul>
        );

        // Hilfsfunktion für Kundenliste
        const renderCustomerList = (txList: any[]) => {
            const activeCustomerIds = new Set(txList.map(tx => tx.user_id));
            const activeCustomers = customers.filter(c => activeCustomerIds.has(c.id));
            return (
                <ul className="info-modal-list">
                    {activeCustomers.length > 0 ? activeCustomers.map(c => (
                        <li key={c.id}>
                            <span>{c.name}</span>
                            <span>{c.dogs?.[0]?.name || '-'}</span>
                        </li>
                    )) : <p className="text-gray-500 italic py-2">Keine aktiven Kunden.</p>}
                </ul>
            );
        };

        switch (type) {
            case 'revenue':
                title = `Einnahmen in ${periodText}`;
                content = renderTxList(filteredTransactions.filter(t => t.amount > 0));
                break;
            case 'debits':
                title = `Abbuchungen in ${periodText}`;
                content = renderTxList(filteredTransactions.filter(t => t.amount < 0));
                break;
            case 'transactions':
                title = `Transaktionen in ${periodText}`;
                content = renderTxList(filteredTransactions);
                break;
            case 'active_customers':
                title = `Aktive Kunden in ${periodText}`;
                content = renderCustomerList(filteredTransactions);
                break;
        }

        setModal({ isOpen: true, title, content, color });
    };

    const handleExportCSV = () => {
        const escapeCSV = (value: any) => {
            const stringValue = String(value ?? '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const headers = ["Datum", "Kunde", "Hund", "Titel", "Typ", "Echter Betrag (ohne Bonus)", "Gebuchter Betrag (inkl. Bonus)", "Erstellt von"];
        const rows = filteredTransactions.map(tx => {
            const customer = customers.find(c => c.id === tx.user_id);
            const creator = users.find(u => u.id === tx.booked_by_id);
            const realAmount = getRealAmount(tx);

            const rowData = [
                new Date(tx.date).toLocaleString('de-DE'),
                customer?.name || 'Unbekannt',
                customer?.dogs[0]?.name || '',
                tx.description,
                tx.type,
                realAmount,
                tx.amount,
                creator?.name || 'Unbekannt'
            ];
            return rowData.map(escapeCSV).join(',');
        });

        const bom = '\uFEFF';
        const csvContent = "data:text/csv;charset=utf-8," + bom + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bericht_umsatz_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const reportTitle = `Umsatzbericht für ${formatPeriodForDisplay(selectedPeriod, reportType)}`;
        const mitarbeiter = selectedMitarbeiter === 'all' ? 'Alle Mitarbeiter' : users.find(u => u.id === selectedMitarbeiter)?.name;

        let tableRows = filteredTransactions.map(tx => {
            const customer = customers.find(c => c.id === tx.user_id);
            const creator = users.find(u => u.id === tx.booked_by_id);
            const realAmount = getRealAmount(tx);
            const isTopupWithBonus = tx.amount > realAmount;
            const displayAmount = isTopupWithBonus
                ? `${realAmount.toLocaleString('de-DE')} € <br><span style="font-size:0.8em; color:#666">(+${(tx.amount - realAmount).toLocaleString('de-DE')} Bonus)</span>`
                : `${tx.amount.toLocaleString('de-DE')} €`;

            return `
                <tr>
                    <td>${new Date(tx.date).toLocaleDateString('de-DE')}</td>
                    <td>${customer?.name || 'Unbekannt'}</td>
                    <td>${tx.description}</td>
                    <td>${creator?.name || 'Unbekannt'}</td>
                    <td style="text-align: right; color: ${tx.amount < 0 ? 'red' : 'green'};">${displayAmount}</td>
                </tr>
            `;
        }).join('');

        const printContent = `
            <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: sans-serif; margin: 2rem; }
                        h1, h2, h3 { color: #333; }
                        h1 { font-size: 1.5rem; }
                        h2 { font-size: 1.2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-top: 2rem; }
                        .summary { display: flex; gap: 2rem; margin-bottom: 2rem; }
                        .summary-item { padding: 1rem; border: 1px solid #eee; border-radius: 8px; }
                        .summary-item .label { font-size: 0.9rem; color: #666; }
                        .summary-item .value { font-size: 1.5rem; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <h3>Mitarbeiter: ${mitarbeiter}</h3>
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Tatsächliche Einnahmen (ohne Bonus)</div>
                            <div class="value" style="color: green;">${revenue.toLocaleString('de-DE')} €</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Gesamtabbuchungen (Leistungen)</div>
                            <div class="value" style="color: red;">${debits.toLocaleString('de-DE')} €</div>
                        </div>
                    </div>
                    <h2>Transaktionsdetails</h2>
                    <table>
                        <thead>
                            <tr><th>Datum</th><th>Kunde</th><th>Titel</th><th>Erstellt von</th><th style="text-align: right;">Einnahme / Abbuchung</th></tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(printContent);
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
        printWindow?.close();
    };

    return (
        <>
            <header className="page-header">
                <h1>Berichte & Statistiken</h1>
                <p>Analysieren und exportieren Sie Ihre echten Umsätze</p>
            </header>

            <div className="content-box filter-export-panel">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label>Berichtstyp</label>
                        <select className="form-input" value={reportType} onChange={e => setReportType(e.target.value as 'monthly' | 'yearly')}>
                            <option value="monthly">Monatlich</option>
                            <option value="yearly">Jährlich</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Zeitraum</label>
                        <select className="form-input" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                            {(reportType === 'monthly' ? availablePeriods.monthly : availablePeriods.yearly).map(p => (
                                <option key={p} value={p}>{formatPeriodForDisplay(p, reportType)}</option>
                            ))}
                        </select>
                    </div>
                    {currentUser.role === 'admin' && (
                        <div className="filter-group">
                            <label>Mitarbeiter</label>
                            <select className="form-input" value={selectedMitarbeiter} onChange={e => setSelectedMitarbeiter(e.target.value)}>
                                <option value="all">Alle Mitarbeiter</option>
                                {users.filter(u => u.role !== 'kunde').map(u => (
                                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="export-actions">
                    <button className="button button-outline" onClick={handleExportCSV}>
                        <Icon name="download" /> Als CSV exportieren
                    </button>
                    <button className="button button-secondary" onClick={handleExportPDF}>
                        <Icon name="printer" /> Als PDF exportieren
                    </button>
                </div>
            </div>

            <div className="kpi-grid">
                <KpiCard
                    title={`Echte Einnahmen (${reportType === 'monthly' ? 'Monat' : 'Jahr'})`}
                    value={`€ ${Math.floor(revenue).toLocaleString('de-DE')}`}
                    icon="creditCard" bgIcon="creditCard" color="green"
                    onClick={() => handleKpiClick('revenue', 'green')}
                />
                <KpiCard
                    title={`Abbuchungen (${reportType === 'monthly' ? 'Monat' : 'Jahr'})`}
                    value={`€ ${Math.floor(debits).toLocaleString('de-DE')}`}
                    icon="creditCard" bgIcon="creditCard" color="orange"
                    onClick={() => handleKpiClick('debits', 'orange')}
                />
                <KpiCard
                    title="Transaktionen"
                    value={filteredTransactions.length.toString()}
                    icon="trendingUp" bgIcon="trendingUp" color="blue"
                    onClick={() => handleKpiClick('transactions', 'blue')}
                />
                <KpiCard
                    title="Aktive Kunden"
                    value={new Set(filteredTransactions.map(tx => tx.user_id)).size.toString()}
                    icon="customers" bgIcon="customers" color="purple"
                    onClick={() => handleKpiClick('active_customers', 'purple')}
                />
            </div>
            <div className="dashboard-bottom-grid">
                <div className="content-box">
                    <h2>Transaktionen im Zeitraum ({filteredTransactions.length})</h2>
                    <ul className="detailed-transaction-list">
                        {filteredTransactions.length > 0 ? filteredTransactions.map(tx => {
                            const customer = customers.find(c => c.id === tx.user_id);
                            const creator = users.find(u => u.id === tx.booked_by_id);
                            return (
                                <li key={tx.id}>
                                    <div className={`tx-icon ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        <Icon name={tx.amount < 0 ? 'arrowDown' : 'trendingUp'} />
                                    </div>
                                    <div className="tx-details">
                                        <div className="tx-line-1">
                                            <span className="tx-title">{tx.description}</span>
                                            <span className="tx-customer">für {customer?.name}</span>
                                        </div>
                                        <div className="tx-line-2">
                                            <span>{new Date(tx.date).toLocaleDateString('de-DE')}</span>
                                            {creator && <span className="tx-creator">&bull; von {creator.name}</span>}
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        € {Math.floor(tx.amount).toLocaleString('de-DE')}
                                    </div>
                                </li>
                            );
                        }) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Transaktionen für den gewählten Filter.</p>}
                    </ul>
                </div>
                <div className="content-box">
                    <h2>Top Kunden im Zeitraum</h2>
                    <ul className="top-customer-list">
                        {topCustomers.length > 0 ? topCustomers.map((custData, index) => {
                            const nameParts = custData.customer.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');
                            const dogName = custData.customer.dogs[0]?.name || '-';

                            return (
                                <li key={custData.customer.id}>
                                    <div className="rank">{index + 1}</div>
                                    <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                        {getInitials(firstName, lastName)}
                                    </div>
                                    <div className="info">
                                        <div className="name">{custData.customer.name}</div>
                                        <div className="tx-count">{dogName} &bull; {custData.count} Transaktionen</div>
                                    </div>
                                    <div className="amount">€ {Math.floor(custData.total).toLocaleString('de-DE')}</div>
                                </li>
                            );
                        }) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Kundendaten für den gewählten Filter.</p>}
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

export default ReportsPage;