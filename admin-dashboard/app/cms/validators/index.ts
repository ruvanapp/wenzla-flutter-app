'use client';
// ══════════════════════════════════════════════════════════════════════════════
// CMS Validators — Zod-free, lightweight schema validation
// ══════════════════════════════════════════════════════════════════════════════

import type { BannerFormData, CategoryFormData } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateBanner(data: Partial<BannerFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title?.trim()) {
    errors.title = 'العنوان مطلوب';
  } else if (data.title.trim().length > 100) {
    errors.title = 'العنوان لا يتجاوز 100 حرف';
  }

  if (data.subtitle && data.subtitle.length > 200) {
    errors.subtitle = 'الوصف لا يتجاوز 200 حرف';
  }

  if (data.buttonText && data.buttonText.length > 50) {
    errors.buttonText = 'نص الزر لا يتجاوز 50 حرف';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCategory(data: Partial<CategoryFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'اسم التصنيف مطلوب';
  } else if (data.name.trim().length > 50) {
    errors.name = 'الاسم لا يتجاوز 50 حرف';
  }

  if (data.colorHex && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(data.colorHex)) {
    errors.colorHex = 'كود اللون غير صحيح (مثال: #FF6B35)';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
