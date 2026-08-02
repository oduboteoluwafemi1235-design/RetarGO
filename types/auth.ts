export type UserRole = 'customer' | 'seller' | 'admin';

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  created_at: string | null;
  updated_at: string | null;
};
