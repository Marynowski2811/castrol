export type Category = 'Engine Oil' | 'Transmission Fluid' | 'Brake Fluid' | 'Grease' | 'Motorcycle Oil' | 'Heavy Duty' | 'Maintenance' | 'Coolant';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  viscosity: string;
  volume: string;
  stock: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id?: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: string;
  paymentMethod: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'customer' | 'admin';
  address?: string;
}

export interface CartItem extends Product {
  quantity: number;
}
