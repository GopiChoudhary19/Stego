'use client';

import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertCircle, Lock, ShieldCheck } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CheckoutForm({ clientSecret, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      
      <div className="flex items-center gap-2 text-[10px] text-text-muted justify-center uppercase tracking-widest font-bold">
        <ShieldCheck className="w-3 h-3" /> Secure SSL Encryption
      </div>

      <button
        disabled={isProcessing || !stripe || !elements}
        className="btn-primary w-full !py-4 !rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <Lock className="w-4 h-4" /> Pay Securely
          </>
        )}
      </button>
    </form>
  );
}

export default function StripePayment({ clientSecret, onSuccess, onError }: CheckoutFormProps) {
  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#ff5a1f',
      colorBackground: '#1a1a1a',
      colorText: '#ffffff',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
  };

  return (
    <div className="fade-in">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
        <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
}
