import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
    clientSecret: string;
    onSuccess: () => void;
    onCancel: () => void;
    amount: number;
    bonus: number;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ clientSecret, onSuccess, onCancel, amount, bonus }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);
        setErrorMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href,
            },
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message ?? 'Ein unbekannter Fehler ist aufgetreten.');
            setLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            setSucceeded(true);
            setLoading(false);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        }
    };

    if (succeeded) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Zahlung erfolgreich!</h3>
                <p className="text-slate-500">
                    Dein Guthaben wird in Kürze gutgeschrieben.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl mb-6">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-500 uppercase tracking-wider font-medium">Betrag</span>
                    <span className="text-lg font-bold text-slate-800">{amount.toFixed(2)} €</span>
                </div>
                {bonus > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-600 font-medium">Bonus</span>
                        <span className="text-sm font-bold text-emerald-600">+ {bonus.toFixed(2)} €</span>
                    </div>
                )}
            </div>

            <PaymentElement options={{ layout: 'tabs' }} />

            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{errorMessage}</p>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                    Abbrechen
                </button>
                <button
                    type="submit"
                    disabled={!stripe || loading}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verarbeite...
                        </>
                    ) : (
                        `Jetzt bezahlen`
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

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    clientSecret,
    amount,
    bonus,
}) => {
    const appearance = {
        theme: 'stripe' as const,
        variables: {
            colorPrimary: '#4f46e5',
            colorBackground: '#ffffff',
            colorText: '#1e293b',
            colorDanger: '#ef4444',
            fontFamily: 'Outfit, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '12px',
        },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Guthaben aufladen</h2>
                                <p className="text-sm text-slate-500">Sichere Bezahlung via Stripe</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <Elements stripe={stripePromise} options={{ clientSecret, appearance, locale: 'de' }}>
                                <CheckoutForm
                                    clientSecret={clientSecret}
                                    onSuccess={onSuccess}
                                    onCancel={onClose}
                                    amount={amount}
                                    bonus={bonus}
                                />
                            </Elements>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
