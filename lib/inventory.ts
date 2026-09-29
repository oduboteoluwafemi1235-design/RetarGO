export type InventoryInput = {
  status?: string | null;
  quantity?: number | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  track_inventory?: boolean | null;
};

export function resolveStockQuantity(product: InventoryInput): number {
  const stockQuantity = Number(product.stock_quantity);
  const quantity = Number(product.quantity);

  const hasStockQuantity = Number.isFinite(stockQuantity);
  const hasQuantity = Number.isFinite(quantity);

  if (hasStockQuantity && hasQuantity) {
    // Prefer the lower value if legacy writes keep one column stale.
    return Math.max(0, Math.floor(Math.min(stockQuantity, quantity)));
  }

  if (hasStockQuantity) {
    return Math.max(0, Math.floor(stockQuantity));
  }

  if (hasQuantity) {
    return Math.max(0, Math.floor(quantity));
  }

  return 0;
}

export function resolveLowStockThreshold(product: InventoryInput): number {
  const threshold = Number(product.low_stock_threshold ?? 5);
  return Number.isFinite(threshold) ? Math.max(0, Math.floor(threshold)) : 5;
}

export function isInventoryTracked(product: InventoryInput): boolean {
  return product.track_inventory !== false;
}

export function isOutOfStock(product: InventoryInput): boolean {
  return isInventoryTracked(product) && resolveStockQuantity(product) <= 0;
}

export function isLowStock(product: InventoryInput): boolean {
  if (!isInventoryTracked(product)) return false;
  const stock = resolveStockQuantity(product);
  const threshold = resolveLowStockThreshold(product);
  return stock > 0 && stock <= threshold;
}

export function getStockStatusLabel(product: InventoryInput): 'out' | 'low' | 'in' {
  if (isOutOfStock(product)) return 'out';
  if (isLowStock(product)) return 'low';
  return 'in';
}
