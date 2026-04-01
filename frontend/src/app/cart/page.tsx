'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { PaymentMethod } from '@/lib/types';
import StripePayment from '@/components/StripePayment';
import confetti from 'canvas-confetti';
import {
  ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ArrowRight,
  CreditCard, Banknote, Smartphone, Clock, AlertCircle, CheckCircle, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const router = useRouter();
  const { items, restaurantName, updateQuantity, removeItem, clearCart, getTotal, getItemCount } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Stripe flow
  const [showStripe, setShowStripe] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [currentOrder, setCurrentOrder] = useState<unknown>(null);

  // Fetch live estimation when cart changes
  useEffect(() => {
    const fetchEstimation = async () => {
      if (items.length === 0) {
        setEstimatedTime(null);
        return;
      }
      setIsEstimating(true);
      try {
        const res = await api.post('/api/orders/estimate', {
          restaurantId: items[0].menuItem.restaurantId,
          items: items.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity })),
          paymentMethod,
        });
        
        // Robust check for the nested data structure
        const prediction = res.data?.data?.estimatedReadyTime;
        if (prediction) {
          setEstimatedTime(prediction);
        }
      } catch (err) {
        console.warn('Estimation service currently unavailable:', err);
        // Silently fail and let the UI show the fallback (~30 mins)
      } finally {
        setIsEstimating(false);
      }
    };

    fetchEstimation();
  }, [items, paymentMethod]);

  const getReadinessText = () => {
    if (isEstimating) return 'Calculating...';
    if (!estimatedTime) return '~30 mins';
    
    try {
      const readyDate = new Date(estimatedTime);
      if (isNaN(readyDate.getTime())) return '~30 mins';
      
      const diffMs = readyDate.getTime() - Date.now();
      const diffMins = Math.max(0, Math.ceil(diffMs / 60000));
      
      return `${diffMins} mins`;
    } catch {
      return '~30 mins';
    }
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setPlacing(true);
    setError('');
    try {
      const res = await api.post('/api/orders', {
        restaurantId: items[0]?.menuItem.restaurantId,
        items: items.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity })),
        paymentMethod,
        specialInstructions: specialInstructions || undefined,
      });

      const order = res.data.data;

      if (paymentMethod === 'CARD') {
        const intentRes = await api.post(`/api/orders/${order.id}/payment-intent`);
        setClientSecret(intentRes.data.data.clientSecret);
        setCurrentOrder(order);
        setShowStripe(true);
      } else {
        setSuccess(true);
        clearCart();
        setTimeout(() => router.push('/orders'), 2000);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setSuccess(true);
    clearCart();
  };

  // Trigger celebration on success
  useEffect(() => {
    if (success) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [success]);

  if (success) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-32 pb-20 flex items-center justify-center bg-surface">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full mx-4 text-center"
          >
            <div className="relative mb-8 flex justify-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
            </div>
            
            <h1 className="text-4xl font-black mb-4 gradient-text">Order Confirmed!</h1>
            <p className="text-text-secondary text-lg mb-8 leading-relaxed">
               Hurray! We&apos;ve received your order. The restaurant is preparing your feast as we speak.
            </p>

            <div className="bg-surface-elevated/50 border border-border/50 rounded-3xl p-6 mb-10 text-left">
               <p className="text-xs font-black text-brand uppercase tracking-widest mb-4">Estimated Ready Time</p>
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                     <Clock className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                     <p className="text-2xl font-black">{getReadinessText()}</p>
                     <p className="text-text-muted text-xs">Arrive at the restaurant by then!</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => router.push('/orders')}
                className="btn-primary w-full !py-4 !rounded-2xl !text-lg shadow-xl shadow-brand/20 group"
              >
                Track My Order
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => router.push('/')}
                className="text-brand font-bold py-2 hover:underline"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        </main>
      </>
    );
  }

  if (showStripe && clientSecret) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20 pb-10">
          <div className="max-w-md mx-auto px-4">
            <button onClick={() => setShowStripe(false)}
                    className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Change payment method
            </button>
            <div className="text-center mb-10">
              <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Secure Checkout</h2>
              <p className="text-text-secondary text-sm">₹{getTotal() + (getTotal() * 0.05)} to be charged securely</p>
            </div>
            <div className="card p-6">
              <StripePayment 
                clientSecret={clientSecret} 
                onSuccess={handlePaymentSuccess} 
                onError={(msg) => setError(msg)} 
              />
            </div>
          </div>
        </main>
      </>
    );
  }


  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center px-4 pt-20">
          <div className="text-center">
            <ShoppingCart className="w-20 h-20 text-text-muted mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-text-secondary mb-6">Browse restaurants and add items to get started</p>
            <button onClick={() => router.push('/restaurants')} className="btn-primary !rounded-xl">
              Browse Restaurants
            </button>
          </div>
        </main>
      </>
    );
  }

  const subtotal = getTotal();
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()}
                  className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="text-3xl font-bold mb-1">Your <span className="gradient-text">Cart</span></h1>
          <p className="text-text-secondary mb-6">From {restaurantName}</p>

          {/* Cart Items */}
          <div className="space-y-3 mb-8">
            {items.map((item) => (
              <div key={item.menuItem.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{item.menuItem.name}</h3>
                  <p className="text-brand font-bold">₹{item.menuItem.price} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-surface-elevated rounded-xl p-1">
                    <button onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center gradient-brand">
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.menuItem.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors group">
                    <Trash2 className="w-4 h-4 text-text-muted group-hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Special Instructions */}
          <div className="card p-5 mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Special Instructions (optional)
            </label>
            <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="input-field !min-h-[80px] resize-none" placeholder="e.g. No onions, extra spicy..." />
          </div>

          {/* Payment Method */}
          <div className="card p-5 mb-6">
            <h3 className="font-semibold mb-4">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'UPI', label: 'UPI', icon: Smartphone },
                { value: 'CARD', label: 'Card', icon: CreditCard },
                { value: 'COD', label: 'Cash', icon: Banknote },
              ] as { value: PaymentMethod; label: string; icon: React.ElementType }[]).map((pm) => (
                <button key={pm.value} onClick={() => setPaymentMethod(pm.value)}
                  className={`p-3 rounded-xl border text-center transition-all duration-200
                    ${paymentMethod === pm.value
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border bg-surface-elevated text-text-secondary hover:border-brand/30'}`}>
                  <pm.icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="card p-5 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal ({getItemCount()} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>GST (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold gradient-text">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Estimation & Total */}
          <div className="card p-5 mb-6 border-dashed border-2 border-brand/20 bg-brand/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand uppercase tracking-wider">Live estimation</p>
                  <p className="text-sm font-medium">Ready in approx. 
                    <span className="font-bold text-lg mx-1 tabular-nums">
                      {getReadinessText()}
                    </span>
                  </p>
                </div>
              </div>
              {estimatedTime && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-border text-[10px] font-bold text-text-muted">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> AI PREDICTED
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button onClick={handlePlaceOrder} disabled={placing}
                  className="btn-primary w-full !py-4 !text-base !rounded-2xl disabled:opacity-50">
            {placing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Place Order — ₹{total.toFixed(2)}</>
            )}
          </button>
        </div>
      </main>
    </>
  );
}
