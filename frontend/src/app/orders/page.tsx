'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import type { Order, OrderStatus } from '@/lib/types';
import {
  Package, Clock, CheckCircle, XCircle, ChefHat,
  ArrowRight, Timer, MapPin
} from 'lucide-react';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType; step: number }> = {
  PENDING: { label: 'Pending', color: 'text-amber-400', icon: Clock, step: 1 },
  ACCEPTED: { label: 'Accepted', color: 'text-blue-400', icon: CheckCircle, step: 2 },
  PREPARING: { label: 'Preparing', color: 'text-orange-400', icon: ChefHat, step: 3 },
  READY: { label: 'Ready!', color: 'text-green-400', icon: Package, step: 4 },
  COMPLETED: { label: 'Completed', color: 'text-green-500', icon: CheckCircle, step: 5 },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', icon: XCircle, step: 0 },
};

const statusSteps: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'live' | 'history'>('live');
  const [loading, setLoading] = useState(true);

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

                    {/* Progress Bar (for active orders) */}
                    {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          {statusSteps.slice(0, 4).map((step, idx) => {
                            const stepConfig = statusConfig[step];
                            const currentStep = config.step;
                            const isActive = currentStep >= stepConfig.step;
                            return (
                              <div key={step} className="flex items-center gap-1 flex-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                                  ${isActive ? 'gradient-brand text-white' : 'bg-surface-elevated text-text-muted'}`}>
                                  {idx + 1}
                                </div>
                                {idx < 3 && (
                                  <div className={`flex-1 h-0.5 mx-1 rounded ${isActive ? 'bg-brand' : 'bg-border'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted">
                          <span>Pending</span><span>Accepted</span><span>Preparing</span><span>Ready</span>
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

                    {/* Cancel button (only for PENDING) */}
                    {order.status === 'PENDING' && (
                      <button onClick={() => cancelOrder(order.id)}
                              className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors">
                        Cancel Order
                      </button>
                    )}
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
