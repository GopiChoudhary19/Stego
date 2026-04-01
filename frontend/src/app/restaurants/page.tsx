'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import RestaurantSkeleton from '@/components/skeletons/RestaurantSkeleton';
import api from '@/lib/api';
import type { Restaurant } from '@/lib/types';
import { calculateDistance } from '@/lib/utils';
import { 
  Search, Star, Clock, 
  ChefHat, Navigation, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SortOption = 'relevance' | 'distance' | 'rating' | 'time';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showTopRatedOnly, setShowTopRatedOnly] = useState(false);

  const categories = ['All', 'Pizza', 'Burger', 'Biryani', 'Healthy', 'Sushi', 'Desserts', 'Chinese'];

  useEffect(() => {
    fetchRestaurants();
    requestLocation();
  }, []);

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.warn('Location access denied:', err.message)
      );
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/restaurants');
      setRestaurants(res.data.data || []);
    } catch {
      setRestaurants(getDemoRestaurants());
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) { fetchRestaurants(); return; }
    try {
      const res = await api.get(`/api/restaurants/search?q=${search}`);
      setRestaurants(res.data.data || []);
    } catch {
      setRestaurants(getDemoRestaurants().filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
      ));
    }
  };

  const processedRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Search & Category Filtering
    result = result.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || 
                             (r.description?.toLowerCase().includes(activeCategory.toLowerCase()));
      const matchesRating = !showTopRatedOnly || (r.avgRating >= 4.5);
      return matchesSearch && matchesCategory && matchesRating;
    });

    // Distance Calculation
    if (userLocation) {
      result = result.map(r => ({
        ...r,
        distanceKm: calculateDistance(userLocation.lat, userLocation.lon, r.latitude, r.longitude)
      }));
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'distance' && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'rating') {
        return (b.avgRating || 0) - (a.avgRating || 0);
      }
      return 0; // Default relevance
    });

    return result;
  }, [restaurants, search, activeCategory, sortBy, showTopRatedOnly, userLocation]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-2">
                Discover <span className="gradient-text">Restaurants</span>
              </h1>
              <p className="text-text-secondary font-medium">Top brands and local favorites at your fingertips</p>
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setShowTopRatedOnly(!showTopRatedOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border
                  ${showTopRatedOnly 
                    ? 'bg-brand/10 border-brand text-brand shadow-sm' 
                    : 'bg-white border-border text-text-muted hover:border-brand/40'}`}
               >
                 <Star className={`w-3.5 h-3.5 ${showTopRatedOnly ? 'fill-brand' : ''}`} />
                 TOP RATED (4.5+)
               </button>
               <div className="relative group">
                 <select 
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value as SortOption)}
                   className="appearance-none bg-white border border-border px-4 py-2 pr-10 rounded-xl text-xs font-bold text-text-muted outline-none focus:border-brand transition-all cursor-pointer"
                 >
                   <option value="relevance">RELEVANCE</option>
                   <option value="distance">NEAREST TO ME</option>
                   <option value="rating">HIGHEST RATING</option>
                 </select>
                 <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
               </div>
            </div>
          </div>

          {/* Sticky Search Bar */}
          <div className="sticky top-20 z-30 bg-surface/80 backdrop-blur-md py-4 -mx-4 px-4 mb-2">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-brand transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input-field !pl-12 !pr-4 !bg-surface-elevated/40 !border-none !rounded-2xl h-12"
                  placeholder="Search for restaurants or dishes..."
                />
              </div>
              <button onClick={handleSearch} className="btn-primary !rounded-2xl px-8 h-12 shadow-lg shadow-brand/20">
                 Find Food
              </button>
            </div>
          </div>

          {/* Categories Quick Filter */}
          <div className="flex gap-3 overflow-x-auto pb-6 mb-6 scrollbar-hide -mx-4 px-4">
             {categories.map((cat) => (
               <button
                 key={cat}
                 onClick={() => setActiveCategory(cat)}
                 className={`px-6 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all duration-300 border
                   ${activeCategory === cat 
                     ? 'bg-brand border-brand text-white shadow-md shadow-brand/20 scale-105' 
                     : 'bg-white border-border text-text-secondary hover:border-brand/40 hover:bg-brand/5'}`}
               >
                 {cat}
               </button>
             ))}
          </div>

          {/* Restaurant Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <RestaurantSkeleton key={i} />
              ))}
            </div>
          ) : processedRestaurants.length === 0 ? (
            <div className="text-center py-24 bg-surface-elevated/20 rounded-3xl border border-dashed border-border flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-brand/5 flex items-center justify-center mb-6">
                <ChefHat className="w-10 h-10 text-brand/40" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No restaurants found</h3>
              <p className="text-text-secondary max-w-xs">Try adjusting your filters or search terms.</p>
              <button 
                onClick={() => {setSearch(''); setActiveCategory('All'); setShowTopRatedOnly(false); setSortBy('relevance');}} 
                className="mt-6 text-brand font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              <AnimatePresence mode="popLayout">
                {processedRestaurants.map((restaurant, i) => (
                  <motion.div
                    layout
                    key={restaurant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/restaurants/${restaurant.id}`} className="group block">
                      {/* Image Container */}
                      <div className="aspect-[16/10] relative overflow-hidden rounded-[2rem] bg-surface-elevated mb-5 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                        {restaurant.imageUrl ? (
                          <img src={restaurant.imageUrl} alt={restaurant.name}
                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/10 to-amber-500/10">
                            <ChefHat className="w-16 h-16 text-brand/30" />
                          </div>
                        )}
                        
                        {/* Dynamic Distance Badge */}
                        {restaurant.distanceKm !== undefined && (
                          <div className="absolute bottom-4 left-4">
                            <div className="bg-white/90 backdrop-blur shadow-lg px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                               <Navigation className="w-3 h-3 text-brand fill-brand/20" />
                               <span className="text-xs font-black">{restaurant.distanceKm.toFixed(1)} KM</span>
                            </div>
                          </div>
                        )}

                        {/* Status badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md
                            ${restaurant.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                            {restaurant.isOpen ? 'Open Now' : 'Closed'}
                          </span>
                        </div>
                      </div>

                      {/* Info Header */}
                      <div className="flex justify-between items-start mb-2 px-1">
                        <h3 className="text-2xl font-black group-hover:text-brand transition-colors truncate">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-black rounded-xl shrink-0 shadow-lg shadow-green-600/20">
                          {restaurant.avgRating?.toFixed(1) || '4.5'} <Star className="w-3 h-3 fill-white" />
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-sm font-bold text-text-muted px-1">
                         <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-brand" /> 
                            <span>{restaurant.distanceKm ? Math.round(restaurant.distanceKm * 8 + 15) : '25-30'} MINS</span>
                         </div>
                         <span className="w-1.5 h-1.5 rounded-full bg-border" />
                         <span className="truncate">{restaurant.description || 'Premium dining experience'}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function getDemoRestaurants(): Restaurant[] {
  return [
    { id: 1, name: "Vincenzo's Italian", description: 'Authentic wood-fired pizzas & Italian favorites', address: '45 Brigade Road, Bangalore', latitude: 12.97, longitude: 77.60, phone: '9876543211', imageUrl: '/images/restaurant_italian.png', openingTime: '11:00', closingTime: '23:00', isOpen: true, avgRating: 4.8, totalReviews: 120, createdAt: '' },
    { id: 2, name: 'The Daily Burger', description: 'Gourmet burgers and artisanal shakes', address: '12 Koramangala, Bangalore', latitude: 12.93, longitude: 77.62, phone: '9876543213', imageUrl: '/images/restaurant_burger.png', openingTime: '10:00', closingTime: '23:00', isOpen: true, avgRating: 4.6, totalReviews: 310, createdAt: '' },
    { id: 3, name: 'Sushi Station', description: 'Fresh Japanese sushi and premium ramen', address: '78 Indiranagar, Bangalore', latitude: 12.97, longitude: 77.64, phone: '9876543212', imageUrl: '/images/restaurant_sushi.png', openingTime: '12:00', closingTime: '22:30', isOpen: true, avgRating: 4.7, totalReviews: 210, createdAt: '' },
    { id: 4, name: 'Green Garden', description: 'Healthy organic bowls and fresh salads', address: '56 HSR Layout, Bangalore', latitude: 12.91, longitude: 77.63, phone: '9876543214', imageUrl: '/images/restaurant_healthy.png', openingTime: '08:00', closingTime: '21:00', isOpen: true, avgRating: 4.9, totalReviews: 153, createdAt: '' },
    { id: 5, name: 'Dragon Wok', description: 'Chinese & Thai street food favorites', address: '90 Whitefield, Bangalore', latitude: 12.97, longitude: 77.75, phone: '9876543215', imageUrl: '/images/stego_hero.png', openingTime: '11:30', closingTime: '22:30', isOpen: true, avgRating: 4.4, totalReviews: 89, createdAt: '' },
  ];
}
