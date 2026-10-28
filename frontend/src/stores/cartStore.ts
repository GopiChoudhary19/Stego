import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, MenuItem } from '@/lib/types';

interface CartState {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string;
  addItem: (menuItem: MenuItem, restaurantName: string) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: '',

      addItem: (menuItem, restaurantName) => {
        const state = get();

        // An order belongs to one restaurant, so adding from another one starts a fresh cart.
        // (Reading state.items after clearing used to put the old restaurant's items straight back.)
        const switching = state.restaurantId !== null && state.restaurantId !== menuItem.restaurantId;
        const current = switching ? [] : state.items;

        const existing = current.find((i) => i.menuItem.id === menuItem.id);
        if (existing) {
          set({
            items: current.map((i) =>
              i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
            restaurantId: menuItem.restaurantId,
            restaurantName,
          });
        } else {
          set({
            items: [...current, { menuItem, quantity: 1 }],
            restaurantId: menuItem.restaurantId,
            restaurantName,
          });
        }
      },

      removeItem: (menuItemId) => {
        const newItems = get().items.filter((i) => i.menuItem.id !== menuItemId);
        set({
          items: newItems,
          restaurantId: newItems.length > 0 ? get().restaurantId : null,
          restaurantName: newItems.length > 0 ? get().restaurantName : '',
        });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [], restaurantId: null, restaurantName: '' }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'stego-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
