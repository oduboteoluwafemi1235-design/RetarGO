'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast-provider';
import { addToCartClient } from '@/lib/supabase/cart.client';

type BuyNowButtonProps = {
  productId: string;
  outOfStock?: boolean;
};

export function BuyNowButton({ productId, outOfStock = false }: BuyNowButtonProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (outOfStock || loading) return;

    try {
      setLoading(true);
      await addToCartClient(productId, 1);
      router.push('/checkout');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue to checkout.';
      pushToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" className="w-full" onClick={onClick} disabled={outOfStock || loading}>
      {outOfStock ? 'Out of stock' : loading ? 'Preparing checkout...' : 'Buy now'}
    </Button>
  );
}
