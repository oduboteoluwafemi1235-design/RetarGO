export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type CategoryTable = {
  id: string;
  name: string;
  image: string;
  created_at: string;
};

export type ProductTable = {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  images: string[];
  condition: 'new' | 'used' | 'refurbished';
  location: string;
  status: 'active' | 'sold' | 'pending';
  created_at: string;
};

export type WishlistTable = {
  id: number;
  user_id: string;
  product_id: string;
};

export type CartTable = {
  id: number;
  user_id: string;
  product_id: string;
  quantity: number;
};

export type OrdersTable = {
  id: number;
  buyer_id: string;
  seller_id: string | null;
  order_number: string;
  shipping_address_id: number | null;
  contact_email: string;
  contact_phone: string;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  coupon_code: string | null;
  checkout_token: string | null;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
};

export type AddressTable = {
  id: number;
  user_id: string;
  label: string;
  full_name: string;
  phone_number: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
  created_at: string;
};

export type OrderItemTable = {
  id: number;
  order_id: number;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type ReviewsTable = {
  id: number;
  user_id: string;
  product_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: CategoryTable;
        Insert: Omit<CategoryTable, 'id' | 'created_at'> & { created_at?: string };
        Update: Partial<Omit<CategoryTable, 'id'>>;
      };
      products: {
        Row: ProductTable;
        Insert: Omit<ProductTable, 'id' | 'created_at'> & { created_at?: string };
        Update: Partial<Omit<ProductTable, 'id'>>;
      };
      wishlist: {
        Row: WishlistTable;
        Insert: Omit<WishlistTable, 'id'>;
        Update: Partial<Omit<WishlistTable, 'id'>>;
      };
      cart: {
        Row: CartTable;
        Insert: Omit<CartTable, 'id'>;
        Update: Partial<Omit<CartTable, 'id'>>;
      };
      orders: {
        Row: OrdersTable;
        Insert: Omit<OrdersTable, 'id' | 'created_at'> & { created_at?: string };
        Update: Partial<Omit<OrdersTable, 'id'>>;
      };
      addresses: {
        Row: AddressTable;
        Insert: Omit<AddressTable, 'id' | 'created_at'> & { created_at?: string };
        Update: Partial<Omit<AddressTable, 'id'>>;
      };
      order_items: {
        Row: OrderItemTable;
        Insert: Omit<OrderItemTable, 'id'>;
        Update: Partial<Omit<OrderItemTable, 'id'>>;
      };
      reviews: {
        Row: ReviewsTable;
        Insert: Omit<ReviewsTable, 'id' | 'created_at'> & { created_at?: string };
        Update: Partial<Omit<ReviewsTable, 'id'>>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          store_name: string | null;
          store_description: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          role: 'customer' | 'seller' | 'admin' | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          store_name?: string | null;
          store_description?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          role?: 'customer' | 'seller' | 'admin' | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          store_name: string | null;
          store_description: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          role: 'customer' | 'seller' | 'admin' | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_transaction: {
        Args: {
          buyer: string;
          p_order_number: string;
          p_shipping_address_id: number | null;
          p_contact_email: string;
          p_contact_phone: string;
          p_subtotal: number;
          p_shipping_cost: number;
          p_tax_amount: number;
          p_total: number;
          p_coupon_code: string | null;
          p_checkout_token: string;
        };
        Returns: {
          id: number;
          order_number: string;
          total: number;
          status: OrdersTable['status'];
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
