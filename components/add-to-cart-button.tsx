'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { useToast } from '@/components/toast-provider';
import { addToCartClient } from '@/lib/supabase/cart.client';

type AddToCartButtonProps = {
  productId: string;
  outOfStock?: boolean;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function AddToCartButton({ productId, outOfStock = false }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToast();
  const router = useRouter();

  const onClick = async () => {
    console.log('Button clicked');
    console.log('Product ID:', productId);

    if (!isUuid(productId)) {
      pushToast('Invalid product ID. Please refresh and try again.', 'error');
      return;
    }

    try {
      setLoading(true);
      await addToCartClient(productId, 1);
      pushToast('Added to cart.', 'success');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add item to cart.';
      pushToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="primary" className="w-full" onClick={onClick} disabled={loading || outOfStock}>
      {outOfStock ? 'Out of stock' : loading ? 'Adding...' : 'Add to cart'}
    </Button>
  );
}
