// ══════════════════════════════════════════════════════════════════════════════
// Categories Service
// ══════════════════════════════════════════════════════════════════════════════

import type { Category, CategoryFormData, ReorderItem } from '../types';
import type { CmsApiClient } from './api';

export class CategoriesService {
  constructor(private api: CmsApiClient) {}

  async getAll(): Promise<Category[]> {
    const result = await this.api.get<Category[]>('/home-cms/categories');
    return Array.isArray(result) ? result : [];
  }

  async create(data: Omit<CategoryFormData, 'id'>): Promise<Category> {
    return this.api.post<Category>('/home-cms/categories', data);
  }

  async update(id: string, data: Partial<CategoryFormData>): Promise<Category> {
    return this.api.patch<Category>(`/home-cms/categories/${id}`, data);
  }

  async remove(id: string): Promise<void> {
    return this.api.delete(`/home-cms/categories/${id}`);
  }

  async toggle(id: string, enabled: boolean): Promise<Category> {
    return this.api.patch<Category>(`/home-cms/categories/${id}`, { enabled });
  }

  async reorder(items: ReorderItem[]): Promise<void> {
    return this.api.put('/home-cms/categories/reorder', { items });
  }

  async uploadImage(id: string, file: File): Promise<Category> {
    return this.api.uploadFile<Category>(`/home-cms/categories/${id}/image`, file);
  }

  buildSwappedOrder(items: Category[], indexA: number, indexB: number): ReorderItem[] {
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
