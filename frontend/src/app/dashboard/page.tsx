'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MenuEditor from '@/components/MenuEditor';
import api from '@/lib/api';
import type { Order, Restaurant } from '@/lib/types';
import {
  ChefHat, Package, CheckCircle, XCircle, Clock,
  TrendingUp, DollarSign, Timer, BarChart3, ListOrdered,
  Calendar, ArrowUpRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

type Tab = 'overview' | 'menu';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [queue, setQueue] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for Peak Hours (In real app, fetch from /api/restaurants/{id}/analytics)
  const hourlyData = [
    { hour: '10 AM', count: 12 }, { hour: '11 AM', count: 18 }, { hour: '12 PM', count: 45 },
    { hour: '1 PM', count: 52 }, { hour: '2 PM', count: 30 }, { hour: '3 PM', count: 15 },
    { hour: '6 PM', count: 25 }, { hour: '7 PM', count: 68 }, { hour: '8 PM', count: 72 },
    { hour: '9 PM', count: 40 }, { hour: '10 PM', count: 20 },
  ];

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
      // Fallback for dev/demo
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
      <main className="min-h-screen pt-24 pb-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header & Restaurant Selector */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white" />
                 </div>
                 <h1 className="text-3xl font-black tracking-tight text-text-primary">
                   Restaurant <span className="gradient-text">Dashboard</span>
                 </h1>
              </div>
              <p className="text-text-secondary font-medium">Control center for {restaurants.find(r => r.id === selectedRestaurant)?.name || 'your restaurant'}</p>
            </div>

            <div className="flex items-center gap-3">
              {restaurants.length > 1 && (
                <select 
                  value={selectedRestaurant || ''} 
                  onChange={(e) => setSelectedRestaurant(Number(e.target.value))}
                  className="input-field !py-2.5 !px-4 !text-sm !w-auto font-bold border-brand/20 bg-brand/5"
                >
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              )}
              <div className="flex items-center gap-1 bg-surface-elevated p-1.5 rounded-2xl border border-border/50">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'overview' ? 'gradient-brand text-white shadow-lg shadow-brand/20' : 'text-text-muted hover:text-text-primary'}`}
                >
                  OVERVIEW
                </button>
                <button 
                  onClick={() => setActiveTab('menu')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'menu' ? 'gradient-brand text-white shadow-lg shadow-brand/20' : 'text-text-muted hover:text-text-primary'}`}
                >
                  MENU MGMT
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { label: 'Active Queue', value: stats.pending + stats.preparing, icon: Timer, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: '+5 this hour' },
                    { label: 'Ready Orders', value: queue.filter(o => o.status === 'READY').length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', trend: 'Wait for pickup' },
                    { label: 'Today Orders', value: stats.totalOrders, icon: ListOrdered, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'Top 10% region' },
                    { label: 'Revenue', value: `₹${stats.todayRevenue}`, icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-500/10', trend: '↑ 12% vs yesterday' },
                  ].map((stat) => (
                    <div key={stat.label} className="card p-6 relative group overflow-hidden">
                      <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full -mr-12 -mt-12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative z-10">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <p className="text-3xl font-black tracking-tight mb-1">{stat.value}</p>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">{stat.label}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-brand">
                           <TrendingUp className="w-3 h-3" /> {stat.trend}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Performance Chart */}
                  <div className="lg:col-span-2 card p-8">
                    <div className="flex items-center justify-between mb-8">
                       <div>
                         <h2 className="text-xl font-bold flex items-center gap-2">
                           <BarChart3 className="w-5 h-5 text-brand" /> Peak Hour Insights
                         </h2>
                         <p className="text-text-muted text-sm">Hourly order distribution</p>
                       </div>
                       <div className="flex items-center gap-2 text-xs font-bold text-text-secondary bg-surface-elevated px-3 py-1.5 rounded-lg border border-border/40">
                          <Calendar className="w-3.5 h-3.5" /> TODAY
                       </div>
                    </div>
                    <div className="h-[320px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={hourlyData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                           <XAxis 
                             dataKey="hour" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }}
                           />
                           <YAxis hide />
                           <Tooltip 
                             cursor={{ fill: 'rgba(255, 107, 53, 0.05)' }}
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                           />
                           <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                             {hourlyData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.count > 50 ? 'var(--color-brand)' : 'var(--color-brand-light)'} />
                             ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex items-center gap-3 p-4 bg-brand/5 rounded-2xl border border-brand/10">
                       <Zap className="w-5 h-5 text-brand fill-brand/20" />
                       <p className="text-sm text-brand-700 font-medium">
                         <span className="font-bold">Pro Tip:</span> Lunch peaks are hitting 12 PM. Consider prep-ahead tasks at 11:30 AM to reduce wait times.
                       </p>
                    </div>
                  </div>

                  {/* Active Queue Snapshot */}
                  <div className="card p-8 flex flex-col h-full bg-surface-elevated/40">
                    <div className="flex items-center justify-between mb-6">
                       <h2 className="text-xl font-bold flex items-center gap-2">
                         <Clock className="w-5 h-5 text-brand" /> Live Queue
                       </h2>
                       <span className="badge badge-brand">{queue.length} Active</span>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {queue.length === 0 ? (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-20" />
                          <p className="text-text-secondary text-sm font-medium">No active orders</p>
                        </div>
                      ) : (
                        queue.map((order) => (
                          <div key={order.id} className="p-4 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group">
                             <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg">#{order.id}</span>
                                <div className="flex gap-1">
                                   {order.status === 'PENDING' && (
                                     <button onClick={() => handleAction(order.id, 'accept')} className="p-1.5 rounded-lg bg-green-500 text-white hover:scale-110 transition-transform shadow-lg shadow-green-500/20"><CheckCircle className="w-3.5 h-3.5" /></button>
                                   )}
                                   {order.status === 'ACCEPTED' && (
                                     <button onClick={() => handleAction(order.id, 'prepare')} className="p-1.5 rounded-lg bg-orange-500 text-white hover:scale-110 transition-transform shadow-lg shadow-orange-500/20"><ChefHat className="w-3.5 h-3.5" /></button>
                                   )}
                                   {order.status === 'PREPARING' && (
                                     <button onClick={() => handleAction(order.id, 'ready')} className="p-1.5 rounded-lg bg-brand text-white hover:scale-110 transition-transform shadow-lg shadow-brand/20"><Package className="w-3.5 h-3.5" /></button>
                                   )}
                                </div>
                             </div>
                             <p className="text-sm font-bold truncate mb-1">{order.userName}</p>
                             <div className="flex items-center justify-between text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                <span>{order.items.length} Items</span>
                                <span>₹{order.totalAmount}</span>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <button className="btn-secondary !w-full !py-3 !rounded-xl !text-xs !bg-white mt-6 group">
                       View Complete Order History
                       <ArrowUpRight className="w-3.5 h-3.5 translate-y-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <div className="card p-8 min-h-[600px]">
                   <div className="mb-8">
                     <h2 className="text-2xl font-black mb-1">Menu <span className="gradient-text">Management</span></h2>
                     <p className="text-text-muted text-sm font-medium">Update prices, visibility and preparation times in real-time.</p>
                   </div>
                   {selectedRestaurant && <MenuEditor restaurantId={selectedRestaurant} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
    {
      id: 2003, userId: 12, userName: 'Anil Gupta', restaurantId: 1, restaurantName: 'My Restaurant',
      totalAmount: 220, status: 'ACCEPTED', scheduledPickupTime: '', estimatedReadyTime: new Date(Date.now() + 15 * 60000).toISOString(),
      actualReadyTime: '', queuePosition: 3, specialInstructions: 'No onions', paymentMethod: 'CARD', paymentStatus: 'SUCCESS',
      items: [
        { id: 4, menuItemId: 104, itemName: 'Chole Bhature', quantity: 1, priceAtOrder: 220 },
      ], createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    },
  ];
}
