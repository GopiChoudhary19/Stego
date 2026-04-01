'use client';

import { MapPin, Navigation, ExternalLink, Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  address: string;
  restaurantName: string;
}

export default function MapPreview({ latitude, longitude, address, restaurantName }: MapPreviewProps) {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="card overflow-hidden group">
      {/* Map Backdrop (Visual Placeholder/Static Image) */}
      <div className="relative h-48 bg-surface-elevated overflow-hidden">
        {/* Using a nice abstract pattern or a static OSM map if we had an API, 
            for now a themed placeholder that looks premium */}
        <div className="absolute inset-0 bg-[url('https://www.openstreetmap.org/assets/layers/default-1f9f2e3f.png')] opacity-20 grayscale group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        
        {/* Animated Marker */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-brand/30 rounded-full animate-ping scale-150" />
            <div className="relative bg-white p-2 rounded-full shadow-2xl border-2 border-brand">
              <MapPin className="w-5 h-5 text-brand fill-brand/10" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Section */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-brand" /> Pickup Location
            </h3>
            <p className="text-text-muted text-sm leading-relaxed">{address}</p>
          </div>
        </div>

        <a 
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !w-full !py-3 !rounded-2xl !text-sm group/btn"
        >
          <Navigation className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
          Get Directions
          <ExternalLink className="w-3.5 h-3.5 opacity-50 ml-1" />
        </a>
      </div>
    </div>
  );
}
