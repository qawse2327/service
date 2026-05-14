export function normalizeColor(color: string): string {
  return color.trim().toLowerCase().replace(/\s+/g, '-');
}

export function getProductImageUrl(productId: number | string, color: string): string {
  const id = String(productId).padStart(2, '0');
  return `/images/products/product-${id}-${normalizeColor(color)}.png`;
}
