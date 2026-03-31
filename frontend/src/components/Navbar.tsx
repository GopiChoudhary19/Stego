'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import {
  Menu, X, ShoppingCart, User, LogOut,
  UtensilsCrossed, LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());

  return (
    <nav className="glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center
                          group-hover:shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Ste<span className="gradient-text">go</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/restaurants" className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary
                          rounded-lg hover:bg-surface-elevated transition-all duration-200">
              Restaurants
            </Link>
            {isAuthenticated && (
              <Link href="/orders" className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary
                            rounded-lg hover:bg-surface-elevated transition-all duration-200">
                My Orders
              </Link>
            )}
            {isAuthenticated && user?.role === 'ROLE_RESTAURANT_OWNER' && (
              <Link href="/dashboard" className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary
                            rounded-lg hover:bg-surface-elevated transition-all duration-200 flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/cart" className="relative p-2.5 rounded-xl hover:bg-surface-elevated transition-all">
              <ShoppingCart className="w-5 h-5 text-text-secondary" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 gradient-brand rounded-full
                              text-[10px] font-bold text-white flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl
                              hover:bg-surface-elevated transition-all">
                  <div className="w-7 h-7 gradient-brand rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                </Link>
                <button onClick={logout} className="p-2.5 rounded-xl hover:bg-red-500/10 transition-all group"
                        title="Logout">
                  <LogOut className="w-4 h-4 text-text-muted group-hover:text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-secondary !py-2 !px-4 !text-sm">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary !py-2 !px-4 !text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-surface-elevated transition-all"
                  onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-border animate-in slide-in-from-top-2">
          <div className="px-4 py-3 space-y-1">
            <Link href="/restaurants" onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary
                           hover:bg-surface-elevated transition-all">
              Restaurants
            </Link>
            {isAuthenticated && (
              <Link href="/orders" onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary
                             hover:bg-surface-elevated transition-all">
                My Orders
              </Link>
            )}
            <Link href="/cart" onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-text-secondary
                           hover:text-text-primary hover:bg-surface-elevated transition-all">
              <span>Cart</span>
              {itemCount > 0 && <span className="badge badge-brand">{itemCount}</span>}
            </Link>
            <div className="pt-2 border-t border-border">
              {isAuthenticated ? (
                <button onClick={() => { logout(); setIsOpen(false); }}
                        className="w-full text-left px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
                  Logout
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setIsOpen(false)} className="btn-secondary flex-1 !text-sm">
                    Sign In
                  </Link>
                  <Link href="/register" onClick={() => setIsOpen(false)} className="btn-primary flex-1 !text-sm">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
