'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import type { Restaurant, MenuItem, MenuCategory } from '@/lib/types';
import {
  Star, MapPin, Clock, ArrowLeft, Plus, Minus,
  ShoppingCart, ChefHat, Leaf, Drumstick, Coffee, IceCream, Sandwich
} from 'lucide-react';

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  VEG: { icon: Leaf, color: 'text-green-400' },
  NON_VEG: { icon: Drumstick, color: 'text-red-400' },
  VEGAN: { icon: Leaf, color: 'text-emerald-400' },
  DRINKS: { icon: Coffee, color: 'text-blue-400' },
  DESSERTS: { icon: IceCream, color: 'text-pink-400' },
  SNACKS: { icon: Sandwich, color: 'text-amber-400' },
  COMBOS: { icon: ChefHat, color: 'text-purple-400' },
};

export default function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const { items, addItem, updateQuantity, getItemCount, getTotal } = useCartStore();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [restRes, menuRes] = await Promise.all([
        api.get(`/api/restaurants/${id}`),
        api.get(`/api/restaurants/${id}/menu`),
      ]);
      setRestaurant(restRes.data.data);
      setMenu(menuRes.data.data || []);
    } catch {
      // Demo data
      setRestaurant({
        id: Number(id), name: 'The Spice Kitchen', description: 'Authentic North & South Indian cuisine with fresh ingredients and traditional recipes.',
        address: '123 MG Road, Bangalore', latitude: 12.97, longitude: 77.59, phone: '9876543210', imageUrl: '',
        openingTime: '10:00', closingTime: '22:00', isOpen: true, avgRating: 4.5, totalReviews: 128, createdAt: ''
      });
      setMenu(getDemoMenu(Number(id)));
    } finally {
      setLoading(false);
    }
  };

  const getItemInCart = (menuItemId: number) => items.find(i => i.menuItem.id === menuItemId);

  const categories = ['ALL', ...Array.from(new Set(menu.map(i => i.category)))];
  const filteredMenu = activeCategory === 'ALL' ? menu : menu.filter(i => i.category === activeCategory);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20 pb-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-64 shimmer rounded-2xl mb-8" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" />)}
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!restaurant) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button onClick={() => router.back()}
                  className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Restaurant Header */}
          <div className="card p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-40 h-40 rounded-2xl bg-gradient-to-br from-brand/10 to-amber-500/10
                            flex items-center justify-center shrink-0">
                {restaurant.imageUrl ? (
                  <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <ChefHat className="w-16 h-16 text-brand/40" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">{restaurant.name}</h1>
                  <span className={`badge ${restaurant.isOpen ? 'badge-success' : 'badge-danger'}`}>
                    {restaurant.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                </div>
                <p className="text-text-secondary mb-4">{restaurant.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <strong>{restaurant.avgRating?.toFixed(1)}</strong>
                    <span className="text-text-muted">({restaurant.totalReviews} reviews)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <MapPin className="w-4 h-4" /> {restaurant.address}
                  </span>
                  {restaurant.openingTime && (
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <Clock className="w-4 h-4" /> {restaurant.openingTime} — {restaurant.closingTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {categories.map((cat) => {
              const config = categoryConfig[cat];
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                    ${activeCategory === cat
                      ? 'gradient-brand text-white shadow-md'
                      : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border'}`}>
                  {config && <config.icon className={`w-4 h-4 ${activeCategory === cat ? 'text-white' : config.color}`} />}
                  {cat === 'ALL' ? 'All Items' : cat.replace('_', ' ')}
                </button>
              );
            })}
          </div>

          {/* Menu Items */}
          <div className="space-y-3">
            {filteredMenu.map((item) => {
              const cartItem = getItemInCart(item.id);
              const config = categoryConfig[item.category] || { icon: ChefHat, color: 'text-brand' };
              return (
                <div key={item.id} className="card p-5 flex items-center gap-4">
                  {/* Category Icon */}
                  <div className="w-14 h-14 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <config.icon className={`w-7 h-7 ${config.color}`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <span className={`badge text-[10px] ${item.category === 'VEG' || item.category === 'VEGAN' ? 'badge-success' : 'badge-warning'}`}>
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-text-muted text-sm truncate">{item.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="font-bold text-brand">₹{item.price}</span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.prepTimeMinutes} min
                      </span>
                    </div>
                  </div>

                  {/* Add/Quantity */}
                  <div className="shrink-0">
                    {cartItem ? (
                      <div className="flex items-center gap-2 bg-surface-elevated rounded-xl p-1">
                        <button onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center
                                         hover:bg-surface-hover transition-colors">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center gradient-brand">
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addItem(item, restaurant.name)}
                              className="btn-primary !py-2 !px-4 !text-sm !rounded-xl"
                              disabled={!item.isAvailable}>
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Cart Bar */}
        {getItemCount() > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
            <div className="max-w-5xl mx-auto">
              <button onClick={() => router.push('/cart')}
                      className="w-full gradient-brand rounded-2xl p-4 flex items-center justify-between
                               shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white/80 text-xs">{getItemCount()} items</p>
                    <p className="text-white font-bold">₹{getTotal().toFixed(2)}</p>
                  </div>
                </div>
                <span className="text-white font-semibold flex items-center gap-2">
                  View Cart <ArrowLeft className="w-4 h-4 rotate-180" />
                </span>
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function getDemoMenu(restaurantId: number): MenuItem[] {
  return [
    { id: 101, restaurantId, name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry', category: 'NON_VEG' as MenuCategory, price: 320, prepTimeMinutes: 20, imageUrl: '', isAvailable: true },
    { id: 102, restaurantId, name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled in tandoor', category: 'VEG' as MenuCategory, price: 260, prepTimeMinutes: 15, imageUrl: '', isAvailable: true },
    { id: 103, restaurantId, name: 'Masala Dosa', description: 'Crispy crepe filled with spiced potatoes', category: 'VEG' as MenuCategory, price: 150, prepTimeMinutes: 10, imageUrl: '', isAvailable: true },
    { id: 104, restaurantId, name: 'Chicken Biryani', description: 'Fragrant basmati rice with tender chicken', category: 'NON_VEG' as MenuCategory, price: 350, prepTimeMinutes: 25, imageUrl: '', isAvailable: true },
    { id: 105, restaurantId, name: 'Mango Lassi', description: 'Refreshing yogurt and mango smoothie', category: 'DRINKS' as MenuCategory, price: 120, prepTimeMinutes: 5, imageUrl: '', isAvailable: true },
    { id: 106, restaurantId, name: 'Gulab Jamun', description: 'Deep-fried milk dumplings in sugar syrup', category: 'DESSERTS' as MenuCategory, price: 100, prepTimeMinutes: 5, imageUrl: '', isAvailable: true },
    { id: 107, restaurantId, name: 'Samosa (2pc)', description: 'Crispy pastry filled with spiced potatoes', category: 'SNACKS' as MenuCategory, price: 60, prepTimeMinutes: 8, imageUrl: '', isAvailable: true },
    { id: 108, restaurantId, name: 'Thali Combo', description: 'Complete meal with dal, rice, roti, sabzi', category: 'COMBOS' as MenuCategory, price: 280, prepTimeMinutes: 18, imageUrl: '', isAvailable: true },
  ];
}
