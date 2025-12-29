
import React, { FC } from 'react';
import Icon from '../ui/Icon';
import { Customer, User } from '../../types';

interface TransactionConfirmationModalProps {
    customer: Customer;
    transaction: {
        title: string;
        amount: number;
        type: 'topup' | 'debit';
        baseAmount?: number;
        bonus?: number;
        meta?: { requirementId?: string };
    };
    onClose: () => void;
    onConfirm: () => void;
    currentUser: User;
}

const TransactionConfirmationModal: FC<TransactionConfirmationModalProps> = ({ customer, transaction, onClose, onConfirm, currentUser }) => {
    const finalBalance = (customer.balance || 0) + transaction.amount;
    const isTopup = transaction.type === 'topup';

    return (
        <div className="modal-overlay">
            <div className="modal-content confirmation-modal-content">
                <div className="modal-header green">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexGrow: 1 }}>
                        <div className="confirmation-header-icon"><Icon name="check" /></div>
                        <div className="confirmation-header-text">
                            <h2>Transaktion bestätigen</h2>
                            <p>Bitte bestätigen Sie die Transaktion für <strong>{customer.name}</strong>.</p>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>

                <div className="modal-body">
                    <div className="confirmation-box employee-box">
                        <Icon name="user" />
                        <span>Mitarbeiter: <strong>{currentUser.name}</strong></span>
                    </div>

                    {isTopup ? (
                        <div className="confirmation-box topup-box">
                            <div className="topup-line">
                                <span>Aufladung</span>
                                <span className="amount">{(transaction.baseAmount || transaction.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            {transaction.bonus && transaction.bonus > 0 &&
                                <div className="topup-line">
                                    <span>Bonus</span>
                                    <span className="amount bonus">+ {transaction.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                </div>
                            }
                            <hr />
                            <div className="topup-line total">
                                <span>Gesamt gutgeschrieben</span>
                                <span className="amount">{transaction.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <p className="description">Beschreibung: {transaction.title} {transaction.bonus && transaction.bonus > 0 ? `+ ${transaction.bonus.toFixed(2)}€ Bonus` : ''}</p>
                        </div>
                    ) : (
                        <div className="confirmation-box debit-box">
                            <div className="debit-header">
                                <h3>Abbuchung</h3>
                                <span className="amount">{transaction.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <p className="description">Beschreibung: {transaction.title}</p>
                        </div>
                    )}

                    <div className="confirmation-box balance-box">
                        <div className="balance-col">
                            <span>Alter Saldo</span>
                            <p>{(customer.balance || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                        </div>
                        <div className="balance-arrow">
                            <Icon name="arrowRight" />
                        </div>
                        <div className="balance-col">
                            <span>Neuer Saldo</span>
                            <p className="final-balance">{finalBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                    <button className="button button-primary" onClick={onConfirm}><Icon name="check" /> Bestätigen und Buchen</button>
                </div>
            </div>
        </div>
    );
}

export default TransactionConfirmationModal;
