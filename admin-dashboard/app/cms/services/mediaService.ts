// ══════════════════════════════════════════════════════════════════════════════
// Media Service — centralised image upload with progress simulation
// ══════════════════════════════════════════════════════════════════════════════

import type { CmsApiClient } from './api';

export interface UploadResult {
  imageUrl: string;
}

export type ProgressCallback = (percent: number) => void;

export class MediaService {
  constructor(private api: CmsApiClient) {}

  /** Upload a banner image. Returns the updated entity. */
  async uploadBannerImage<T>(
    bannerId: string,
    file: File,
    onProgress?: ProgressCallback
  ): Promise<T> {
    this.simulateProgress(onProgress);
    return this.api.uploadFile<T>(`/home-cms/banners/${bannerId}/image`, file);
  }

  /** Upload a category image. Returns the updated entity. */
  async uploadCategoryImage<T>(
    categoryId: string,
    file: File,
    onProgress?: ProgressCallback
  ): Promise<T> {
    this.simulateProgress(onProgress);
    return this.api.uploadFile<T>(`/home-cms/categories/${categoryId}/image`, file);
  }

  /** Validate file before upload */
  validate(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE_MB = 5;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WEBP.' };
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return { valid: false, error: `حجم الصورة يتجاوز ${MAX_SIZE_MB}MB.` };
    }
    return { valid: true };
  }

  private simulateProgress(onProgress?: ProgressCallback) {
    if (!onProgress) return;
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(p + 15, 90);
      onProgress(p);
      if (p >= 90) clearInterval(t);
    }, 150);
  }
}
