export type Category = {
  id: string;
  name: string;
  image: string;
  created_at: string;
  product_count?: number;
};

export type ProductCondition = 'new' | 'used' | 'refurbished';
export type ProductStatus = 'active' | 'sold' | 'pending';

export type Product = {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  images: string[];
  condition: ProductCondition;
  location: string;
  status: ProductStatus;
  created_at: string;
};

export type ProductWithCategory = Product & {
  category: string;
  brand?: string | null;
  discount?: number | null;
  rating?: number | null;
  seller_name?: string | null;
  specs?: Record<string, string> | null;
};

export type Review = {
  id: number;
  user_id: string;
  product_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  author_name?: string | null;
};

export type Wishlist = {
  id: number;
  user_id: string;
  product_id: string;
};

export type CartItem = {
  id: number;
  user_id: string;
  product_id: string;
  quantity: number;
};

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  total: number;
  status: OrderStatus;
  created_at: string;
};
