// ══════════════════════════════════════════════════════════════════════════════
// CMS Store — pure React useReducer, no external library required
// ══════════════════════════════════════════════════════════════════════════════

import type {
  Banner, Category, FeaturedStore, MerchantSummary,
  UploadProgress, CmsState,
} from '../types';

// ── Action types ──────────────────────────────────────────────────────────────

export type CmsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BANNERS'; payload: Banner[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_FEATURED_STORES'; payload: FeaturedStore[] }
  | { type: 'SET_MERCHANTS'; payload: MerchantSummary[] }
  | { type: 'UPSERT_BANNER'; payload: Banner }
  | { type: 'REMOVE_BANNER'; payload: string }
  | { type: 'UPSERT_CATEGORY'; payload: Category }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'UPSERT_FEATURED'; payload: FeaturedStore }
  | { type: 'REMOVE_FEATURED'; payload: string }
  | { type: 'SET_UPLOAD'; payload: UploadProgress }
  | { type: 'CLEAR_UPLOAD'; payload: string }
  | { type: 'MARK_SAVED' };

// ── Initial state ─────────────────────────────────────────────────────────────

export const initialCmsState: CmsState = {
  banners: [],
  categories: [],
  featuredStores: [],
  merchants: [],
  loading: false,
  error: null,
  uploads: {},
  isDirty: false,
  lastSaved: null,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

export function cmsReducer(state: CmsState, action: CmsAction): CmsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_BANNERS':
      return { ...state, banners: action.payload };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'SET_FEATURED_STORES':
      return { ...state, featuredStores: action.payload };

    case 'SET_MERCHANTS':
      return { ...state, merchants: action.payload };

    case 'UPSERT_BANNER': {
      const exists = state.banners.find(b => b.id === action.payload.id);
      return {
        ...state,
        isDirty: true,
        banners: exists
          ? state.banners.map(b => b.id === action.payload.id ? action.payload : b)
          : [...state.banners, action.payload],
      };
    }

    case 'REMOVE_BANNER':
      return {
        ...state,
        isDirty: true,
        banners: state.banners.filter(b => b.id !== action.payload),
      };

    case 'UPSERT_CATEGORY': {
      const exists = state.categories.find(c => c.id === action.payload.id);
      return {
        ...state,
        isDirty: true,
        categories: exists
          ? state.categories.map(c => c.id === action.payload.id ? action.payload : c)
          : [...state.categories, action.payload],
      };
    }

    case 'REMOVE_CATEGORY':
      return {
        ...state,
        isDirty: true,
        categories: state.categories.filter(c => c.id !== action.payload),
      };

    case 'UPSERT_FEATURED': {
      const exists = state.featuredStores.find(f => f.id === action.payload.id);
      return {
        ...state,
        isDirty: true,
        featuredStores: exists
          ? state.featuredStores.map(f => f.id === action.payload.id ? action.payload : f)
          : [...state.featuredStores, action.payload],
      };
    }

    case 'REMOVE_FEATURED':
      return {
        ...state,
        isDirty: true,
        featuredStores: state.featuredStores.filter(f => f.id !== action.payload),
      };

    case 'SET_UPLOAD':
      return {
        ...state,
        uploads: { ...state.uploads, [action.payload.entityId]: action.payload },
      };

    case 'CLEAR_UPLOAD': {
      const uploads = { ...state.uploads };
      delete uploads[action.payload];
      return { ...state, uploads };
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false, lastSaved: new Date() };

    default:
      return state;
  }
}
