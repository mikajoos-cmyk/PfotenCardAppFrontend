import React, { FC, useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Wallet, Coins, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import Icon from '../ui/Icon';
import { apiClient } from '../../lib/api';

// Stripe laden (Public Key aus Env)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface TopUpModalProps {
    onClose: () => void;
    onSuccess: () => void;
    token: string | null;
    balanceConfig: any;
}

/**
 * Stripe Payment Form Komponente
 */
const CheckoutForm: FC<{
    amount: number;
    bonus: number;
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ amount, bonus, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSucceeded, setIsSucceeded] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL für Redirect-Zahlarten
                return_url: window.location.origin + '/?status=success&type=topup',
            },
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || 'Zahlung fehlgeschlagen');
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setIsSucceeded(true);
            setTimeout(onSuccess, 1500);
        }
    };

    if (isSucceeded) {
        return (
            <div className="payment-success-view">
                <div className="success-icon-wrapper">
                    <CheckCircle2 size={48} />
                </div>
                <h3>Zahlung erfolgreich!</h3>
                <p>Dein Guthaben wird in Kürze gutgeschrieben.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="topup-payment-form">
            <PaymentElement />

            {errorMessage && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="modal-footer" style={{ padding: '1.5rem 0 0 0', border: 'none', background: 'transparent' }}>
                <button type="button" className="button button-outline" onClick={onCancel} disabled={isProcessing}>
                    Abbrechen
                </button>
                <button type="submit" className="button button-primary" disabled={!stripe || isProcessing}>
                    {isProcessing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Loader2 className="animate-spin" size={18} /> Verarbeite...
                        </div>
                    ) : (
                        `€${(amount).toLocaleString('de-DE', { minimumFractionDigits: 2 })} aufladen`
                    )}
                </button>
            </div>
        </form>
    );
};

/**
 * Haupt-Modal für die Guthabenaufladung
 */
const TopUpModal: FC<TopUpModalProps> = ({ onClose, onSuccess, token, balanceConfig }) => {
    const [step, setStep] = useState<'amount' | 'payment'>('amount');
    const [amount, setAmount] = useState<number>(20);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoadingSecret, setIsLoadingSecret] = useState(false);

    // Optionen aus Config oder Standardwerte
    const options = balanceConfig?.top_up_options || [
        { amount: 20, bonus: 0 },
        { amount: 50, bonus: 5 },
        { amount: 100, bonus: 15 }
    ];

    // Aktuellen Bonus berechnen
    const currentBonus = useMemo(() => {
        const sorted = [...options].sort((a, b) => b.amount - a.amount);
        const opt = sorted.find(o => amount >= o.amount);
        return opt ? opt.bonus : 0;
    }, [amount, options]);

    // Backend-Intent erstellen
    const handleStartPayment = async () => {
        if (amount < 5) {
            alert("Der Mindestbetrag beträgt 5€.");
            return;
        }

        setIsLoadingSecret(true);
        try {
            const res = await apiClient.createTopUpIntent({ amount, bonus: currentBonus }, token);
            setClientSecret(res.clientSecret);
            setStep('payment');
        } catch (error) {
            console.error("Failed to create intent", error);
            alert("Fehler beim Initiieren der Zahlung. Bitte versuchen Sie es später erneut.");
        } finally {
            setIsLoadingSecret(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => step === 'amount' && onClose()}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
                <div className="modal-header orange">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'white', color: 'var(--brand-orange)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={20} />
                        </div>
                        <h2>Guthaben aufladen</h2>
                    </div>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>

                <div className="modal-body">
                    {step === 'amount' ? (
                        <div className="topup-amount-selection">
                            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                                Wie viel Guthaben möchten Sie aufladen?
                            </p>

                            <div className="amount-pills" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {options.map((opt: any) => (
                                    <button
                                        key={opt.amount}
                                        className={`amount-pill ${amount === opt.amount ? 'active' : ''}`}
                                        onClick={() => setAmount(opt.amount)}
                                    >
                                        <span className="val">€{opt.amount}</span>
                                        {opt.bonus > 0 && <span className="bonus">+{opt.bonus}€ Bonus</span>}
                                    </button>
                                ))}
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Anderer Betrag (€)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="z.B. 30"
                                    min="5"
                                    step="5"
                                    value={amount || ''}
                                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                                    style={{ fontSize: '1.1rem', padding: '0.8rem' }}
                                />
                            </div>

                            {currentBonus > 0 && (
                                <div className="bonus-info-card">
                                    <div style={{ color: 'var(--brand-green)' }}><Coins size={22} /></div>
                                    <div>
                                        <strong style={{ fontSize: '0.95rem' }}>Bonus gesichert!</strong>
                                        <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>
                                            Sie erhalten zusätzlich <strong>{currentBonus}€</strong> als Bonus gutgeschrieben.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="summary-row">
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Neue Balance danach:</span>
                                <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                                    €{(amount + currentBonus).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                </strong>
                            </div>
                        </div>
                    ) : (
                        <div className="topup-payment-container">
                            <div className="payment-summary">
                                <div className="summary-item">
                                    <span>Aufladebetrag:</span>
                                    <span>€{amount.toFixed(2)}</span>
                                </div>
                                {currentBonus > 0 && (
                                    <div className="summary-item bonus">
                                        <span>Guthaben-Bonus:</span>
                                        <span>+ €{currentBonus.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="summary-item total">
                                    <span>Gesamt-Guthaben:</span>
                                    <span>€{(amount + currentBonus).toFixed(2)}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                {clientSecret && (
                                    <Elements stripe={stripePromise} options={{
                                        clientSecret,
                                        appearance: {
                                            theme: 'stripe',
                                            variables: {
                                                colorPrimary: '#22C55E',
                                                colorBackground: '#ffffff',
                                                colorText: '#0F172A',
                                                colorDanger: '#ef4444',
                                                fontFamily: 'Poppins, sans-serif',
                                                borderRadius: '8px',
                                            }
                                        }
                                    }}>
                                        <CheckoutForm
                                            amount={amount}
                                            bonus={currentBonus}
                                            onSuccess={onSuccess}
                                            onCancel={() => setStep('amount')}
                                        />
                                    </Elements>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                <ShieldCheck size={14} /> Sichere SSL-Verschlüsselung via Stripe
                            </div>
                        </div>
                    )}
                </div>

                {step === 'amount' && (
                    <div className="modal-footer">
                        <button className="button button-outline" onClick={onClose}>Abbrechen</button>
                        <button className="button button-primary" onClick={handleStartPayment} disabled={isLoadingSecret || amount < 5}>
                            {isLoadingSecret ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Loader2 className="animate-spin" size={18} /> Lädt...
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Weiter zur Zahlung <ArrowRight size={18} />
                                </div>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .amount-pill {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.8rem 0.5rem;
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--card-background);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .amount-pill:hover {
                    border-color: var(--brand-orange);
                    background: var(--bg-accent-orange);
                    transform: translateY(-2px);
                }
                .amount-pill.active {
                    border-color: var(--brand-orange);
                    background: var(--bg-accent-orange);
                    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
                }
                .amount-pill .val {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .amount-pill .bonus {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--brand-green);
                    margin-top: 4px;
                    background: rgba(34, 197, 94, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .bonus-info-card {
                    display: flex;
                    gap: 1rem;
                    background: var(--bg-accent-green);
                    border: 1px solid var(--brand-green);
                    padding: 1rem;
                    border-radius: 12px;
                    margin-top: 1rem;
                    align-items: center;
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 1.5rem;
                    padding: 1.25rem 1rem;
                    background: var(--card-background-hover);
                    border-radius: 12px;
                    border: 1px dashed var(--border-color);
                }
                .payment-summary {
                    margin-bottom: 1.5rem;
                    padding: 1.25rem;
                    background: var(--card-background-hover);
                    border-radius: 12px;
                }
                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.95rem;
                    margin-bottom: 0.5rem;
                    color: var(--text-secondary);
                }
                .summary-item.bonus { color: var(--brand-green); font-weight: 600; }
                .summary-item.total {
                    margin-top: 0.75rem;
                    padding-top: 0.75rem;
                    border-top: 1px solid var(--border-color);
                    font-weight: 800;
                    font-size: 1.15rem;
                    color: var(--text-primary);
                }
                .error-banner {
                    display: flex;
                    gap: 0.75rem;
                    background: var(--danger-bg-light);
                    color: var(--brand-red);
                    padding: 1rem;
                    border-radius: 8px;
                    margin: 1rem 0;
                    font-size: 0.9rem;
                    align-items: center;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default TopUpModal;
