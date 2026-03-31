export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  imageUrl: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
  avgRating: number;
  totalReviews: number;
  distanceKm?: number;
  createdAt: string;
}

export interface MenuItem {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  category: MenuCategory;
  price: number;
  prepTimeMinutes: number;
  imageUrl: string;
  isAvailable: boolean;
}

export type MenuCategory = 'VEG' | 'NON_VEG' | 'VEGAN' | 'DRINKS' | 'DESSERTS' | 'SNACKS' | 'COMBOS';

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CARD' | 'UPI' | 'COD';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: number;
  menuItemId: number;
  itemName: string;
  quantity: number;
  priceAtOrder: number;
}

export interface Order {
  id: number;
  userId: number;
  userName: string;
  restaurantId: number;
  restaurantName: string;
  totalAmount: number;
  status: OrderStatus;
  scheduledPickupTime: string;
  estimatedReadyTime: string;
  actualReadyTime: string;
  queuePosition: number;
  specialInstructions: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  createdAt: string;
}

export interface Review {
  id: number;
  userId: number;
  userName: string;
  restaurantId: number;
  orderId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
  role: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderRequest {
  restaurantId: number;
  items: { menuItemId: number; quantity: number }[];
  paymentMethod: PaymentMethod;
  scheduledPickupTime?: string;
  specialInstructions?: string;
}

export interface EstimationResponse {
  estimatedReadyTime: string;
}
