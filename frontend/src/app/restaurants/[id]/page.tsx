'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MapPreview from '@/components/MapPreview';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import type { Restaurant, MenuItem, MenuCategory } from '@/lib/types';
import {
  Star, Clock, ArrowLeft, Plus, Minus, Search,
  ShoppingCart, ChefHat, Leaf, Drumstick, Coffee, IceCream, Sandwich
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [menuSearch, setMenuSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

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
        id: Number(id), name: 'Vincenzo\'s Italian', description: 'Authentic wood-fired pizzas & Italian favorites. Hand-crafted dough and premium toppings.',
        address: '45 Brigade Road, Bangalore', latitude: 12.97, longitude: 77.60, phone: '9876543210', imageUrl: '/images/restaurant_italian.png',
        openingTime: '10:00', closingTime: '22:00', isOpen: true, avgRating: 4.8, totalReviews: 120, createdAt: ''
      });
      setMenu(getDemoMenu(Number(id)));
    } finally {
      setLoading(false);
    }
  };

  const getItemInCart = (menuItemId: number) => items.find(i => i.menuItem.id === menuItemId);

  const categories = ['ALL', ...Array.from(new Set(menu.map(i => i.category)))];
  
  const filteredMenu = menu.filter(item => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
                         item.description?.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesVeg = !vegOnly || (item.category === 'VEG' || item.category === 'VEGAN');
    
    return matchesCategory && matchesSearch && matchesVeg;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-24 pb-10 bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-64 shimmer rounded-3xl mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-40 shimmer rounded-3xl" />)}
               </div>
               <div className="h-96 shimmer rounded-3xl hidden lg:block" />
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
      <main className="min-h-screen pt-24 pb-32 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button onClick={() => router.back()}
                  className="flex items-center gap-2 text-text-secondary hover:text-brand font-bold mb-8 transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Restaurants
          </button>

          {/* Restaurant Header */}
          <div className="grid lg:grid-cols-3 gap-8 mb-10">
             <div className="lg:col-span-2 card p-6 sm:p-10 !bg-surface-elevated/40 border-none shadow-none">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="w-full sm:w-48 h-48 rounded-[2rem] bg-gradient-to-br from-brand/10 to-amber-500/10 flex items-center justify-center shrink-0 shadow-lg">
                    {restaurant.imageUrl ? (
                      <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover rounded-[2rem]" />
                    ) : (
                      <ChefHat className="w-20 h-20 text-brand/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{restaurant.name}</h1>
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm
                        ${restaurant.isOpen ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {restaurant.isOpen ? 'Open Now' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-text-secondary text-lg mb-6 leading-relaxed font-medium">
                      {restaurant.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="bg-green-600 text-white px-2 py-1 rounded-xl flex items-center gap-1 font-black shadow-lg shadow-green-600/20">
                          {restaurant.avgRating?.toFixed(1)} <Star className="w-3.5 h-3.5 fill-white" />
                        </div>
                        <span className="text-text-muted font-bold">{restaurant.totalReviews} reviews</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted font-bold">
                        <Clock className="w-4 h-4 text-brand" /> {restaurant.openingTime} — {restaurant.closingTime}
                      </div>
                    </div>
                  </div>
                </div>
             </div>
             
             {/* Map Card */}
             <div className="hidden lg:block">
               <MapPreview 
                latitude={restaurant.latitude} 
                longitude={restaurant.longitude} 
                address={restaurant.address} 
                restaurantName={restaurant.name} 
              />
             </div>
          </div>

          {/* Menu Search & Filters */}
          <div className="sticky top-20 z-30 bg-surface/80 backdrop-blur-md py-4 -mx-4 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" />
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="input-field !pl-10 !h-12 !bg-surface-elevated/40 !border-none !rounded-[1.25rem] text-sm"
                placeholder={`Search delicious dishes from ${restaurant.name}...`}
              />
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
               <button 
                  onClick={() => setVegOnly(!vegOnly)}
                  className={`flex items-center gap-2 px-6 h-12 rounded-[1.25rem] border font-black text-xs uppercase tracking-wider transition-all
                    ${vegOnly ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-white border-border text-text-muted hover:border-brand/40'}`}
               >
                  <div className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${vegOnly ? 'border-green-500 bg-green-500' : 'border-text-muted'}`}>
                    {vegOnly && <div className="w-1 h-1 rounded-full bg-white" />}
                  </div>
                  Veg Only
               </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sticky Sidebar (Desktop) */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-44 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-6 px-4">Menu Selection</p>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all
                      ${activeCategory === cat 
                        ? 'bg-brand text-white shadow-xl shadow-brand/30 scale-105' 
                        : 'text-text-muted hover:bg-white hover:text-text-primary hover:shadow-sm'}`}
                  >
                    {cat === 'ALL' ? 'Explores All' : cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </aside>

            {/* Menu Items */}
            <div className="flex-1 space-y-12">
               {categories.filter(c => activeCategory === 'ALL' || c === activeCategory).map(cat => {
                 const catItems = filteredMenu.filter(i => i.category === cat || cat === 'ALL');
                 if (catItems.length === 0) return null;
                 
                 return (
                   <div key={cat}>
                     <h2 className="text-xl font-black mb-8 flex items-center gap-3 px-1">
                        {cat === 'ALL' ? 'Menu Favorites' : cat.replace('_', ' ')}
                        <span className="h-px bg-border flex-1" />
                        <span className="text-text-muted text-xs font-black">{catItems.length} ITEMS</span>
                     </h2>
                     <div className="grid md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                       {catItems.map((item, i) => {
                         const cartItem = getItemInCart(item.id);
                         const config = categoryConfig[item.category] || { icon: ChefHat, color: 'text-brand' };
                         const isVeg = item.category === 'VEG' || item.category === 'VEGAN';
                         
                         return (
                           <motion.div 
                            layout
                            key={item.id} 
                            className="group flex gap-4 p-5 rounded-[2rem] bg-surface-elevated/40 hover:bg-white hover:shadow-2xl hover:shadow-brand/5 hover:-translate-y-1 border border-transparent hover:border-brand/5 transition-all duration-500"
                           >
                             <div className="flex-1 min-w-0">
                               <div className="mb-2 flex items-center gap-2">
                                 <div className={`w-3.5 h-3.5 border-2 flex items-center justify-center shrink-0 ${isVeg ? 'border-green-500' : 'border-red-500'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                 </div>
                                 {(i + 1) % 4 === 0 && (
                                   <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">
                                      <Star className="w-2.5 h-2.5 fill-amber-500" /> Bestseller
                                   </span>
                                 )}
                               </div>
                               <h3 className="font-bold text-lg text-text-primary mb-1 group-hover:text-brand transition-colors">{item.name}</h3>
                               <p className="text-brand font-black text-sm mb-3">₹{item.price}</p>
                               <p className="text-text-muted text-xs line-clamp-2 leading-relaxed font-medium">
                                 {item.description || 'Artisanally prepared with authentic ingredients and secret spices.'}
                               </p>
                             </div>

                             <div className="flex flex-col items-center gap-2 shrink-0">
                                <div className="relative w-32 h-32 group/img">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-3xl shadow-md group-hover/img:scale-105 transition-transform duration-500" />
                                  ) : (
                                    <div className="w-full h-full rounded-3xl bg-surface-elevated flex items-center justify-center border border-border group-hover/img:border-brand/20 transition-colors">
                                       <config.icon className={`w-10 h-10 ${config.color} opacity-40`} />
                                    </div>
                                  )}
                                  
                                  <div className="absolute -bottom-3 inset-x-3">
                                    {cartItem ? (
                                      <div className="flex items-center justify-between bg-white text-brand rounded-[1rem] p-1.5 shadow-2xl border border-brand/20">
                                        <button onClick={() => updateQuantity(item.id, cartItem.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-brand/5 rounded-lg active:scale-95 transition-all">
                                          <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-6 text-center font-black text-sm tabular-nums">{cartItem.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, cartItem.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-brand/5 rounded-lg active:scale-95 transition-all">
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button onClick={() => addItem(item, restaurant.name)}
                                              className="w-full py-3 bg-white text-brand font-black text-xs rounded-[1rem] shadow-2xl border border-brand/20 hover:bg-brand hover:text-white active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
                                              disabled={!item.isAvailable}>
                                        ADD
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {!item.isAvailable && <span className="text-[10px] font-black text-red-500 mt-4">UNAVAILABLE</span>}
                                {item.isAvailable && <span className="text-[9px] font-bold text-text-muted mt-4 uppercase tracking-widest opacity-60">Customizable</span>}
                             </div>
                           </motion.div>
                         );
                       })}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>

        {/* Maps Card (Mobile Only) */}
        <div className="lg:hidden px-4 mt-8 mb-4">
           <MapPreview 
              latitude={restaurant.latitude} 
              longitude={restaurant.longitude} 
              address={restaurant.address} 
              restaurantName={restaurant.name} 
            />
        </div>

        {/* Floating Cart Bar */}
        {getItemCount() > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-surface via-surface to-transparent">
            <div className="max-w-xl mx-auto">
              <button onClick={() => router.push('/cart')}
                      className="w-full gradient-brand rounded-2xl p-5 flex items-center justify-between
                                shadow-2xl shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all outline-none">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-white/80 text-[10px] font-black uppercase tracking-widest leading-none mb-1">{getItemCount()} items added</p>
                    <p className="text-white text-xl font-black tabular-nums">₹{getTotal().toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                  <span className="text-white font-black text-sm uppercase tracking-widest">Cart</span>
                   <ArrowLeft className="w-4 h-4 rotate-180" />
                </div>
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
    { id: 101, restaurantId, name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry with succulent pieces of roasted chicken.', category: 'NON_VEG' as MenuCategory, price: 320, prepTimeMinutes: 20, imageUrl: '', isAvailable: true },
    { id: 102, restaurantId, name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled in tandoor with capsicum and onions.', category: 'VEG' as MenuCategory, price: 260, prepTimeMinutes: 15, imageUrl: '', isAvailable: true },
    { id: 103, restaurantId, name: 'Masala Dosa', description: 'Crispy rice crepe filled with spiced potatoes and served with coconut chutney.', category: 'VEG' as MenuCategory, price: 150, prepTimeMinutes: 10, imageUrl: '', isAvailable: true },
    { id: 104, restaurantId, name: 'Chicken Biryani', description: 'Fragrant basmati rice cooked with tender chicken and aromatic Indian spices.', category: 'NON_VEG' as MenuCategory, price: 350, prepTimeMinutes: 25, imageUrl: '', isAvailable: true },
    { id: 105, restaurantId, name: 'Mango Lassi', description: 'Refreshing yogurt and Alfonso mango smoothie served chilled.', category: 'DRINKS' as MenuCategory, price: 120, prepTimeMinutes: 5, imageUrl: '', isAvailable: true },
    { id: 106, restaurantId, name: 'Gulab Jamun (2pc)', description: 'Deep-fried milk dumplings soaked in cardamom flavored sugar syrup.', category: 'DESSERTS' as MenuCategory, price: 100, prepTimeMinutes: 5, imageUrl: '', isAvailable: true },
    { id: 107, restaurantId, name: 'Vegetable Samosa', description: 'Crispy pastry filled with spiced potatoes and peas (2 pieces).', category: 'SNACKS' as MenuCategory, price: 60, prepTimeMinutes: 8, imageUrl: '', isAvailable: true },
    { id: 108, restaurantId, name: 'Executive Thali', description: 'Complete meal with dal makhani, paneer, choice of bread, rice, and salad.', category: 'COMBOS' as MenuCategory, price: 280, prepTimeMinutes: 18, imageUrl: '', isAvailable: true },
  ];
}
