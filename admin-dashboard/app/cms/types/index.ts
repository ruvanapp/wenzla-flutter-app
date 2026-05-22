// ══════════════════════════════════════════════════════════════════════════════
// CMS Shared Types
// ══════════════════════════════════════════════════════════════════════════════

// ── Domain models ─────────────────────────────────────────────────────────────

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  imageUrl?: string;
  color1: string;
  color2: string;
  sortOrder: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  iconEmoji?: string;
  imageUrl?: string;
  colorHex?: string;
  sortOrder: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeaturedStore {
  id: string;
  merchantId: string;
  sortOrder: number;
  enabled: boolean;
  merchant: MerchantSummary;
  createdAt?: string;
}

export interface MerchantSummary {
  id: string;
  storeName: string;
  logoUrl?: string;
  bannerUrl?: string;
  status?: string;
}

// ── Form types ────────────────────────────────────────────────────────────────

export type BannerFormData = Omit<Banner, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
export type CategoryFormData = Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export const defaultBannerForm = (): BannerFormData => ({
  title: '',
  subtitle: '',
  buttonText: '',
  imageUrl: undefined,
  color1: '#D4A437',
  color2: '#8B4513',
  sortOrder: 0,
  enabled: true,
});

export const defaultCategoryForm = (): CategoryFormData => ({
  name: '',
  iconEmoji: '🍯',
  imageUrl: undefined,
  colorHex: '#D4A437',
  sortOrder: 0,
  enabled: true,
});

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ── API types ─────────────────────────────────────────────────────────────────

export interface ApiConfig {
  baseUrl: string;
  token: string;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

export interface ApiError {
  message: string;
  status: number;
}

// ── Upload types ──────────────────────────────────────────────────────────────

export interface UploadProgress {
  entityId: string;
  progress: number; // 0–100
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
}

// ── Toast types ───────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// ── CMS Store state ───────────────────────────────────────────────────────────

export interface CmsState {
  banners: Banner[];
  categories: Category[];
  featuredStores: FeaturedStore[];
  merchants: MerchantSummary[];
  loading: boolean;
  error: string | null;
  uploads: Record<string, UploadProgress>;
  isDirty: boolean;
  lastSaved: Date | null;
}

// ── Tab types ─────────────────────────────────────────────────────────────────

export type CmsTab = 'banners' | 'categories' | 'featured' | 'promotions' | 'sections';

export interface TabDefinition {
  key: CmsTab;
  label: string;
  icon: string;
  count?: number;
}

// ── Preview types ─────────────────────────────────────────────────────────────

export interface PreviewData {
  banners: Banner[];
  categories: Category[];
  featuredStores: FeaturedStore[];
}
