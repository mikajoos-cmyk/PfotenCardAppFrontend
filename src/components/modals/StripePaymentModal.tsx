import React, { useState, FC } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Wallet, Coins } from 'lucide-react';
import Icon from '../ui/Icon';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
    clientSecret: string;
    onSuccess: () => void;
    onCancel: () => void;
    amount: number;
    bonus: number;
}

const CheckoutForm: FC<CheckoutFormProps> = ({ amount, bonus, onSuccess, onCancel }) => {
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
            <PaymentElement options={{ layout: 'tabs' }} />

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

interface StripePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientSecret: string;
    amount: number;
    bonus: number;
}

export const StripePaymentModal: FC<StripePaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    clientSecret,
    amount,
    bonus,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header orange">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'white', color: 'var(--brand-orange)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h2 style={{ color: 'white' }}>Zahlung abschließen</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9, color: 'white' }}>Sichere SSL-Verschlüsselung via Stripe</p>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}><Icon name="x" /></button>
                </div>

                <div className="modal-body" style={{ padding: '1.5rem' }}>
                    <div className="payment-summary">
                        <div className="summary-item">
                            <span>Aufladebetrag:</span>
                            <span>€{amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {bonus > 0 && (
                            <div className="summary-item bonus">
                                <span>Guthaben-Bonus:</span>
                                <span>+ €{bonus.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="summary-item total">
                            <span>Gesamt-Guthaben:</span>
                            <span>€{(amount + bonus).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

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
                            },
                            locale: 'de'
                        }}>
                            <CheckoutForm
                                clientSecret={clientSecret}
                                amount={amount}
                                bonus={bonus}
                                onSuccess={onSuccess}
                                onCancel={onClose}
                            />
                        </Elements>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
                        <ShieldCheck size={14} /> 100% Sicher & Verschlüsselt
                    </div>
                </div>
            </div>

            <style>{`
                .payment-summary {
                    margin-bottom: 1.5rem;
                    padding: 1.25rem;
                    background: var(--card-background-hover);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
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
                .payment-success-view {
                    text-align: center;
                    padding: 3rem 1rem;
                }
                .success-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    background: var(--bg-accent-green);
                    color: var(--brand-green);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
                @keyframes bounceIn {
                    from { opacity: 0; transform: scale(0.3); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
