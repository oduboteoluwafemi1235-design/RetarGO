'use client';

import { useState, useEffect } from 'react';
import { toggleWishlistClient } from '@/lib/supabase/wishlist.client';

export function WishlistButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    // optimistic UI: we could fetch initial state, but keep simple
  }, [productId]);

  const onClick = async () => {
    setLoading(true);
    try {
      const res = await toggleWishlistClient(productId);
      setActive(!!res.added);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={onClick} className={`rounded-full p-2 ${active ? 'bg-red-100 text-red-600' : 'bg-white text-slate-500'} shadow`} aria-label="Toggle wishlist">
      {loading ? '…' : active ? '♥' : '♡'}
    </button>
  );
}
