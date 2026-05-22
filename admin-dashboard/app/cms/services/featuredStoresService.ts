// ══════════════════════════════════════════════════════════════════════════════
// Featured Stores Service
// ══════════════════════════════════════════════════════════════════════════════

import type { FeaturedStore, MerchantSummary } from '../types';
import type { CmsApiClient } from './api';

export class FeaturedStoresService {
  constructor(private api: CmsApiClient) {}

  async getAll(): Promise<FeaturedStore[]> {
    const result = await this.api.get<FeaturedStore[]>('/home-cms/featured-stores');
    return Array.isArray(result) ? result : [];
  }

  async getMerchantsList(): Promise<MerchantSummary[]> {
    const result = await this.api.get<MerchantSummary[]>('/home-cms/merchants-list');
    return Array.isArray(result) ? result : [];
  }

  async pin(merchantId: string, sortOrder: number): Promise<FeaturedStore> {
    return this.api.post<FeaturedStore>('/home-cms/featured-stores', { merchantId, sortOrder });
  }

  async unpin(id: string): Promise<void> {
    return this.api.delete(`/home-cms/featured-stores/${id}`);
  }

  async toggle(id: string, enabled: boolean): Promise<FeaturedStore> {
    return this.api.patch<FeaturedStore>(`/home-cms/featured-stores/${id}`, { enabled });
  }
}
