'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import RestaurantSkeleton from '@/components/skeletons/RestaurantSkeleton';
import api from '@/lib/api';
import type { Restaurant } from '@/lib/types';
import { Search, MapPin, Star, Clock, Filter, ChefHat } from 'lucide-react';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/restaurants');
      setRestaurants(res.data.data || []);
    } catch {
      // Demo data when backend is not available
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

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Discover <span className="gradient-text">Restaurants</span>
            </h1>
            <p className="text-text-secondary">Pre-order from the best restaurants near you</p>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field !pl-12 !pr-4"
                placeholder="Search restaurants..."
              />
            </div>
            <button onClick={handleSearch} className="btn-primary !rounded-xl">
              <Search className="w-4 h-4" /> Search
            </button>
            <button className="btn-secondary !rounded-xl">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {/* Restaurant Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <RestaurantSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ChefHat className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No restaurants found</h3>
              <p className="text-text-secondary">Try a different search or check back later</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((restaurant, i) => (
                <Link key={restaurant.id} href={`/restaurants/${restaurant.id}`}
                      className="card overflow-hidden group" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Image */}
                  <div className="h-48 relative overflow-hidden bg-surface-elevated">
                    {restaurant.imageUrl ? (
                      <img src={restaurant.imageUrl} alt={restaurant.name}
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/10 to-amber-500/10">
                        <ChefHat className="w-16 h-16 text-brand/30" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`badge ${restaurant.isOpen ? 'badge-success' : 'badge-danger'}`}>
                        {restaurant.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-brand transition-colors">
                      {restaurant.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-text-secondary mb-3">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        {restaurant.avgRating?.toFixed(1) || '4.5'}
                      </span>
                      <span>({restaurant.totalReviews || 0} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-text-muted">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{restaurant.address}</span>
                    </div>
                    {restaurant.openingTime && (
                      <div className="flex items-center gap-1.5 text-sm text-text-muted mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{restaurant.openingTime} - {restaurant.closingTime}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
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
