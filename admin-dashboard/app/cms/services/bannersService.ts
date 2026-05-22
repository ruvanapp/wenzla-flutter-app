// ══════════════════════════════════════════════════════════════════════════════
// Banners Service
// ══════════════════════════════════════════════════════════════════════════════

import type { Banner, BannerFormData, ReorderItem } from '../types';
import type { CmsApiClient } from './api';

export class BannersService {
  constructor(private api: CmsApiClient) {}

  async getAll(): Promise<Banner[]> {
    const result = await this.api.get<Banner[]>('/home-cms/banners');
    return Array.isArray(result) ? result : [];
  }

  async create(data: Omit<BannerFormData, 'id'>): Promise<Banner> {
    return this.api.post<Banner>('/home-cms/banners', data);
  }

  async update(id: string, data: Partial<BannerFormData>): Promise<Banner> {
    return this.api.patch<Banner>(`/home-cms/banners/${id}`, data);
  }

  async remove(id: string): Promise<void> {
    return this.api.delete(`/home-cms/banners/${id}`);
  }

  async toggle(id: string, enabled: boolean): Promise<Banner> {
    return this.api.patch<Banner>(`/home-cms/banners/${id}`, { enabled });
  }

  async reorder(items: ReorderItem[]): Promise<void> {
    return this.api.put('/home-cms/banners/reorder', { items });
  }

  async uploadImage(id: string, file: File): Promise<Banner> {
    return this.api.uploadFile<Banner>(`/home-cms/banners/${id}/image`, file);
  }

  /** Swap two adjacent items and call reorder */
  buildSwappedOrder(items: Banner[], indexA: number, indexB: number): ReorderItem[] {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    if (indexB < 0 || indexB >= sorted.length) return [];
    const temp = sorted[indexA].sortOrder;
    return sorted.map((item, i) => {
      if (i === indexA) return { id: item.id, sortOrder: sorted[indexB].sortOrder };
      if (i === indexB) return { id: item.id, sortOrder: temp };
      return { id: item.id, sortOrder: item.sortOrder };
    });
  }
}
