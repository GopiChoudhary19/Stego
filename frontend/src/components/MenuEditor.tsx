'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { MenuItem, MenuCategory } from '@/lib/types';
import { 
  Plus, Search, Edit3, Check, X, 
  Clock, IndianRupee, Loader2, AlertCircle,
  Pizza, Flame, Leaf, Coffee, IceCream, Box, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuEditorProps {
  restaurantId: number;
}

const CATEGORY_ICONS: Record<MenuCategory, React.ElementType> = {
  VEG: Leaf,
  NON_VEG: Flame,
  VEGAN: Leaf,
  DRINKS: Coffee,
  DESSERTS: IceCream,
  SNACKS: Pizza,
  COMBOS: Box
};

export default function MenuEditor({ restaurantId }: MenuEditorProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/restaurants/${restaurantId}/menu`);
      setItems(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      setUpdatingId(item.id);
      const updatedData = { ...item, isAvailable: !item.isAvailable };
      await api.put(`/api/menu/${item.id}`, updatedData);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: !item.isAvailable } : i));
    } catch (err) {
      alert('Failed to update availability');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdatePrice = async (item: MenuItem, newPrice: number) => {
    if (newPrice < 0) return;
    try {
      setUpdatingId(item.id);
      const updatedData = { ...item, price: newPrice };
      await api.put(`/api/menu/${item.id}`, updatedData);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: newPrice } : i));
    } catch (err) {
      alert('Failed to update price');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-text-muted text-sm font-medium">Loading your menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search items or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-10 !py-2.5 !text-sm"
          />
        </div>
        <button className="btn-primary !py-2.5 !px-5 !text-sm !rounded-xl w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Item List */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] || Package;
            const isUpdating = updatingId === item.id;

            return (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all
                  ${!item.isAvailable ? 'opacity-70 bg-surface-elevated/50' : 'bg-surface-card'}`}
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-surface-elevated shrink-0">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-[10px] font-black text-white px-1.5 py-0.5 border border-white/50 rounded uppercase tracking-tighter">OFF</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-base truncate">{item.name}</h3>
                    <div className={`p-1 rounded-md bg-surface-elevated`}>
                       <Icon className="w-3 h-3 text-brand" />
                    </div>
                  </div>
                  <p className="text-text-muted text-xs truncate max-w-sm">{item.description}</p>
                </div>

                {/* Editor Controls */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                  {/* Price */}
                  <div className="flex items-center bg-surface-elevated rounded-xl px-3 py-1.5 gap-2 border border-border/50">
                    <IndianRupee className="w-3 h-3 text-text-muted" />
                    <input 
                      type="number"
                      className="bg-transparent font-bold text-sm w-16 outline-none"
                      defaultValue={item.price}
                      onBlur={(e) => handleUpdatePrice(item, Number(e.target.value))}
                    />
                  </div>

                  {/* Prep Time */}
                  <div className="flex items-center text-text-secondary text-sm gap-1.5 px-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium text-xs whitespace-nowrap">{item.prepTimeMinutes}m</span>
                  </div>

                  {/* Available Toggle */}
                  <button 
                    disabled={isUpdating}
                    onClick={() => handleToggleAvailability(item)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all
                      ${item.isAvailable 
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                  >
                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                     item.isAvailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {item.isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}
                  </button>

                  {/* Action */}
                  <button className="p-2.5 rounded-xl hover:bg-surface-elevated transition-colors text-text-muted hover:text-brand">
                     <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && !loading && (
          <div className="card p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-text-muted" />
            </div>
            <div>
              <p className="text-text-primary font-bold">No items found</p>
              <p className="text-text-muted text-sm">Try adjusting your search or add a new item.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
