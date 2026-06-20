// ══════════════════════════════════════════════════════════════════════════════
// Featured Products Service
// ══════════════════════════════════════════════════════════════════════════════

import type { CmsApiClient } from './api';

export interface FeaturedProduct {
  id: string;
  productId: string;
  customLabel?: string;
  sortOrder: number;
  enabled: boolean;
  product: ProductSummary;
  createdAt?: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  weight?: string;
  stock?: number;
  merchant?: { id: string; storeName: string; logoUrl?: string };
}

export class FeaturedProductsService {
  constructor(private api: CmsApiClient) {}

  async getAll(): Promise<FeaturedProduct[]> {
    const result = await this.api.get<FeaturedProduct[]>('/home-cms/featured-products');
    return Array.isArray(result) ? result : [];
  }

  async getProductsList(): Promise<ProductSummary[]> {
    const result = await this.api.get<ProductSummary[]>('/home-cms/products-list');
    return Array.isArray(result) ? result : [];
  }

  async pin(productId: string, sortOrder: number): Promise<FeaturedProduct> {
    return this.api.post<FeaturedProduct>('/home-cms/featured-products', { productId, sortOrder });
  }

  async unpin(id: string): Promise<void> {
    return this.api.delete(`/home-cms/featured-products/${id}`);
  }

  async toggle(id: string, enabled: boolean): Promise<FeaturedProduct> {
    return this.api.patch<FeaturedProduct>(`/home-cms/featured-products/${id}`, { enabled });
  }
}
