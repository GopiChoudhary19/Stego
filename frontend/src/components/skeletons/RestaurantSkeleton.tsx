import React from 'react';

export default function RestaurantSkeleton() {
  return (
    <div className="card overflow-hidden">
      {/* Image Skeleton */}
      <div className="h-48 bg-surface-elevated animate-pulse relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div className="h-6 bg-surface-elevated rounded-lg w-2/3 animate-pulse" />
          <div className="h-5 bg-surface-elevated rounded-md w-12 animate-pulse" />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-surface-elevated rounded-full animate-pulse" />
          <div className="h-4 bg-surface-elevated rounded-lg w-1/3 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <div className="h-3 bg-surface-elevated rounded-lg w-full animate-pulse" />
          <div className="h-3 bg-surface-elevated rounded-lg w-4/5 animate-pulse" />
        </div>
        
        <div className="pt-2 flex items-center gap-3">
          <div className="h-8 bg-surface-elevated rounded-xl grow animate-pulse" />
          <div className="w-8 h-8 bg-surface-elevated rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
