'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import type { Order, Restaurant } from '@/lib/types';
import {
  ChefHat, Package, CheckCircle, XCircle, Clock,
  TrendingUp, Users, DollarSign, Timer, ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [queue, setQueue] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchQueue();
      fetchOrders();
      const interval = setInterval(() => { fetchQueue(); fetchOrders(); }, 8000);
      return () => clearInterval(interval);
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const res = await api.get('/api/restaurants/my');
      const data = res.data.data || [];
      setRestaurants(data);
      if (data.length > 0) setSelectedRestaurant(data[0].id);
    } catch {
      setRestaurants([{ id: 1, name: 'My Restaurant', description: '', address: '123 Main St', latitude: 0, longitude: 0, phone: '', imageUrl: '', openingTime: '10:00', closingTime: '22:00', isOpen: true, avgRating: 4.5, totalReviews: 50, createdAt: '' }]);
      setSelectedRestaurant(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await api.get(`/api/orders/restaurant/${selectedRestaurant}/queue`);
      setQueue(res.data.data || []);
    } catch {
      setQueue(getDemoQueue());
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get(`/api/orders/restaurant/${selectedRestaurant}`);
      setAllOrders(res.data.data || []);
    } catch {
      setAllOrders(getDemoQueue());
    }
  };

  const handleAction = async (orderId: number, action: string) => {
    try {
      await api.patch(`/api/orders/${orderId}/${action}`);
      fetchQueue();
      fetchOrders();
    } catch {
      // ignore
    }
  };

  const stats = {
    pending: queue.filter(o => o.status === 'PENDING').length,
    preparing: queue.filter(o => o.status === 'PREPARING').length,
    todayRevenue: allOrders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + o.totalAmount, 0),
    totalOrders: allOrders.length,
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold">Restaurant <span className="gradient-text">Dashboard</span></h1>
              <p className="text-text-secondary">Manage orders and track performance</p>
            </div>
            {restaurants.length > 1 && (
              <select value={selectedRestaurant || ''} onChange={(e) => setSelectedRestaurant(Number(e.target.value))}
                      className="input-field !w-auto">
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Preparing', value: stats.preparing, icon: ChefHat, color: 'text-orange-400', bg: 'bg-orange-500/10' },
              { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Revenue', value: `₹${stats.todayRevenue}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
            ].map((stat) => (
              <div key={stat.label} className="card p-5">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-text-muted text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Order Queue */}
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-brand" /> Active Queue
          </h2>

          {queue.length === 0 ? (
            <div className="card p-10 text-center">
              <Package className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No active orders in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((order) => (
                <div key={order.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">Order #{order.id}</p>
                        <span className={`badge ${
                          order.status === 'PENDING' ? 'badge-warning' :
                          order.status === 'ACCEPTED' ? 'badge-brand' :
                          order.status === 'PREPARING' ? 'badge-warning' : 'badge-success'
                        }`}>{order.status}</span>
                      </div>
                      <p className="text-text-muted text-sm">
                        by {order.userName} • Queue #{order.queuePosition}
                      </p>
                    </div>
                    <p className="text-xl font-bold gradient-text">₹{order.totalAmount}</p>
                  </div>

                  {/* Items */}
                  <div className="bg-surface-elevated rounded-xl p-3 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1">
                        <span>{item.quantity}× {item.itemName}</span>
                        <span className="text-text-muted">₹{item.priceAtOrder * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.specialInstructions && (
                    <p className="text-sm text-amber-400 mb-3 italic">📝 {order.specialInstructions}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleAction(order.id, 'accept')}
                                className="btn-primary !py-2 !px-4 !text-sm !rounded-xl flex-1">
                          <CheckCircle className="w-4 h-4" /> Accept
                        </button>
                        <button onClick={() => handleAction(order.id, 'cancel')}
                                className="btn-secondary !py-2 !px-4 !text-sm !rounded-xl !border-red-500/30 !text-red-400">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button onClick={() => handleAction(order.id, 'prepare')}
                              className="btn-primary !py-2 !px-4 !text-sm !rounded-xl flex-1">
                        <ChefHat className="w-4 h-4" /> Start Preparing
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button onClick={() => handleAction(order.id, 'ready')}
                              className="btn-primary !py-2 !px-4 !text-sm !rounded-xl flex-1 !bg-green-600">
                        <Package className="w-4 h-4" /> Mark as Ready
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function getDemoQueue(): Order[] {
  return [
    {
      id: 2001, userId: 10, userName: 'Raj Kumar', restaurantId: 1, restaurantName: 'My Restaurant',
      totalAmount: 580, status: 'PENDING', scheduledPickupTime: '', estimatedReadyTime: new Date(Date.now() + 20 * 60000).toISOString(),
      actualReadyTime: '', queuePosition: 1, specialInstructions: 'Extra spicy please', paymentMethod: 'UPI', paymentStatus: 'SUCCESS',
      items: [
        { id: 1, menuItemId: 101, itemName: 'Butter Chicken', quantity: 2, priceAtOrder: 320 },
      ], createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: 2002, userId: 11, userName: 'Priya Sharma', restaurantId: 1, restaurantName: 'My Restaurant',
      totalAmount: 410, status: 'PREPARING', scheduledPickupTime: '', estimatedReadyTime: new Date(Date.now() + 10 * 60000).toISOString(),
      actualReadyTime: '', queuePosition: 2, specialInstructions: '', paymentMethod: 'COD', paymentStatus: 'PENDING',
      items: [
        { id: 2, menuItemId: 102, itemName: 'Paneer Tikka', quantity: 1, priceAtOrder: 260 },
        { id: 3, menuItemId: 103, itemName: 'Masala Dosa', quantity: 1, priceAtOrder: 150 },
      ], createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },
  ];
}
