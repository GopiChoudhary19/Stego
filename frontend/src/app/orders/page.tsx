'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import type { Order, OrderStatus, MenuItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, CheckCircle, XCircle, ChefHat,
  ArrowRight, Timer, MapPin, RefreshCcw
} from 'lucide-react';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType; step: number }> = {
  PENDING: { label: 'Pending', color: 'text-amber-400', icon: Clock, step: 1 },
  ACCEPTED: { label: 'Accepted', color: 'text-blue-400', icon: CheckCircle, step: 2 },
  PREPARING: { label: 'Preparing', color: 'text-orange-400', icon: ChefHat, step: 3 },
  READY: { label: 'Ready!', color: 'text-green-400', icon: Package, step: 4 },
  COMPLETED: { label: 'Completed', color: 'text-green-500', icon: CheckCircle, step: 5 },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', icon: XCircle, step: 0 },
};

// statusSteps removed as it was unused

export default function OrdersPage() {
  const router = useRouter();
  const { addItem, clearCart } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'live' | 'history'>('live');
  const [loading, setLoading] = useState(true);

  const handleReorder = (order: Order) => {
    clearCart();
    order.items.forEach(item => {
      // Create a dummy MenuItem object for the cart store
      const menuItem: MenuItem = {
        id: item.menuItemId,
        name: item.itemName,
        price: item.priceAtOrder,
        description: '',
        imageUrl: '',
        isAvailable: true,
        restaurantId: order.restaurantId,
        prepTimeMinutes: 15,
        category: 'VEG'
      };
      addItem(menuItem, order.restaurantName);
    });
    router.push('/cart');
  };

  useEffect(() => {
    fetchOrders();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [tab]);

  const fetchOrders = async () => {
    try {
      const endpoint = tab === 'live' ? '/api/orders/live' : '/api/orders';
      const res = await api.get(endpoint);
      setOrders(res.data.data || []);
    } catch {
      setOrders(getDemoOrders());
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      await api.post(`/api/orders/${orderId}/cancel`);
      fetchOrders();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">
            My <span className="gradient-text">Orders</span>
          </h1>

          {/* Tabs */}
          <div className="flex rounded-xl bg-surface-elevated p-1 mb-8">
            {(['live', 'history'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setLoading(true); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${tab === t ? 'gradient-brand text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}>
                {t === 'live' ? '🔴 Live Orders' : '📋 Order History'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-40 shimmer rounded-2xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-text-secondary">Your {tab === 'live' ? 'active' : 'past'} orders will show here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const config = statusConfig[order.status];
                return (
                  <div key={order.id} className="card p-5 fade-in">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{order.restaurantName}</h3>
                        <p className="text-text-muted text-sm">
                          Order #{order.id} • {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${
                          order.status === 'READY' ? 'badge-success' :
                          order.status === 'CANCELLED' ? 'badge-danger' :
                          order.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'
                        }`}>
                          <config.icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </span>
                        <p className="text-lg font-bold mt-1 gradient-text">₹{order.totalAmount}</p>
                      </div>
                    </div>

                    {/* Immersive Live Status (Zomato/Swiggy Style) */}
                    {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                      <div className="mb-6 bg-brand/5 rounded-3xl p-6 border border-brand/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center animate-pulse">
                               <config.icon className="w-6 h-6 text-brand" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-brand uppercase tracking-widest tracking-tighter">Current Status</p>
                               <h4 className="text-xl font-black text-text-primary">
                                 {order.status === 'PENDING' ? 'Waiting for Restaurant...' : 
                                  order.status === 'ACCEPTED' ? 'Order Confirmed!' :
                                  order.status === 'PREPARING' ? 'Chef is cooking your meal' :
                                  order.status === 'READY' ? 'Ready for Pickup!' : 'Status Unknown'}
                               </h4>
                            </div>
                          </div>

                          {/* Progress Stepper */}
                          <div className="relative h-2 bg-surface-elevated rounded-full mb-8 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${(config.step / 4) * 100}%` }}
                               className="absolute inset-y-0 left-0 gradient-brand"
                             />
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-center">
                             {['Confirmed', 'Kitchen', 'Preparing', 'Ready'].map((step, idx) => (
                               <div key={step} className="space-y-2">
                                 <div className={`w-2 h-2 rounded-full mx-auto transition-colors duration-500
                                   ${config.step > idx ? 'bg-brand shadow-[0_0_8px_rgba(255,100,0,0.5)]' : 'bg-border'}`} />
                                 <span className={`text-[10px] font-bold uppercase ${config.step > idx ? 'text-brand' : 'text-text-muted'}`}>{step}</span>
                               </div>
                             ))}
                          </div>
                        </div>

                        {/* Fun Microcopy (Zomato Style) */}
                        <div className="mt-6 pt-4 border-t border-brand/5 flex items-center gap-2 text-[11px] font-medium text-text-muted italic">
                           <ChefHat className="w-3 h-3 text-brand" />
                           {order.status === 'PREPARING' ? "Our chef is adding some secret spices right now..." :
                            order.status === 'ACCEPTED' ? "Great choices! The kitchen is getting ready." :
                            order.status === 'READY' ? "It's hot and smelling amazing. See you in a bit!" :
                            "Almost there! Hang tight."}
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="border-t border-border pt-3 space-y-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-text-secondary">
                            {item.quantity}× {item.itemName}
                          </span>
                          <span>₹{(item.priceAtOrder * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Estimated time & queue */}
                    {order.estimatedReadyTime && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
                        <span className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5" />
                          Ready by {new Date(order.estimatedReadyTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {order.queuePosition && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Queue #{order.queuePosition}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {order.status === 'PENDING' && (
                        <button onClick={() => cancelOrder(order.id)}
                                className="text-sm font-medium text-red-500 hover:text-red-400 py-2 px-4 rounded-xl hover:bg-red-500/10 transition-all">
                          Cancel Order
                        </button>
                      )}
                      {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                        <button onClick={() => handleReorder(order)}
                                className="btn-secondary !text-sm !py-2 !px-4 hover:!bg-brand/5 hover:!text-brand hover:!border-brand">
                          <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                          Reorder Now
                        </button>
                      )}
                      <Link href={`/restaurants/${order.restaurantId}`} 
                            className="text-sm font-medium text-brand hover:text-brand-600 py-2 px-4 rounded-xl hover:bg-brand/5 transition-all flex items-center">
                        View Restaurant <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function getDemoOrders(): Order[] {
  return [
    {
      id: 1001, userId: 1, userName: 'Demo User', restaurantId: 1, restaurantName: 'The Spice Kitchen',
      totalAmount: 580, status: 'PREPARING', scheduledPickupTime: '', estimatedReadyTime: new Date(Date.now() + 15 * 60000).toISOString(),
      actualReadyTime: '', queuePosition: 2, specialInstructions: '', paymentMethod: 'UPI', paymentStatus: 'SUCCESS',
      items: [
        { id: 1, menuItemId: 101, itemName: 'Butter Chicken', quantity: 1, priceAtOrder: 320 },
        { id: 2, menuItemId: 102, itemName: 'Paneer Tikka', quantity: 1, priceAtOrder: 260 },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 1002, userId: 1, userName: 'Demo User', restaurantId: 2, restaurantName: 'Pizza Paradise',
      totalAmount: 450, status: 'READY', scheduledPickupTime: '', estimatedReadyTime: '',
      actualReadyTime: new Date().toISOString(), queuePosition: 0, specialInstructions: '', paymentMethod: 'CARD', paymentStatus: 'SUCCESS',
      items: [
        { id: 3, menuItemId: 201, itemName: 'Margherita Pizza', quantity: 1, priceAtOrder: 250 },
        { id: 4, menuItemId: 202, itemName: 'Garlic Bread', quantity: 2, priceAtOrder: 100 },
      ],
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
  ];
}
