'use client';
// ══════════════════════════════════════════════════════════════════════════════
// useCmsStore — central state hook that wires services + reducer together
// ══════════════════════════════════════════════════════════════════════════════

import { useReducer, useCallback, useMemo } from 'react';
import { cmsReducer, initialCmsState } from '../store/cmsReducer';
import { createCmsServices } from '../services';
import type { Banner, Category, BannerFormData, CategoryFormData } from '../types';

interface UseCmsStoreOptions {
  baseUrl: string;
  token: string;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useCmsStore({ baseUrl, token, onToast }: UseCmsStoreOptions) {
  const [state, dispatch] = useReducer(cmsReducer, initialCmsState);

  const services = useMemo(
    () => createCmsServices(baseUrl, token),
    [baseUrl, token]
  );

  const toast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      onToast?.(message, type);
    },
    [onToast]
  );

  // ── Load all ────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const [banners, categories, featuredStores, merchants] = await Promise.allSettled([
        services.banners.getAll(),
        services.categories.getAll(),
        services.featuredStores.getAll(),
        services.featuredStores.getMerchantsList(),
      ]);
      if (banners.status === 'fulfilled') dispatch({ type: 'SET_BANNERS', payload: banners.value });
      if (categories.status === 'fulfilled') dispatch({ type: 'SET_CATEGORIES', payload: categories.value });
      if (featuredStores.status === 'fulfilled') dispatch({ type: 'SET_FEATURED_STORES', payload: featuredStores.value });
      if (merchants.status === 'fulfilled') dispatch({ type: 'SET_MERCHANTS', payload: merchants.value });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      dispatch({ type: 'SET_ERROR', payload: msg });
      toast('خطأ في تحميل البيانات', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [services, toast]);

  // ── Banner actions ──────────────────────────────────────────────────────────

  const bannerActions = useMemo(() => ({
    async save(data: BannerFormData) {
      try {
        if (data.id) {
          const updated = await services.banners.update(data.id, data);
          dispatch({ type: 'UPSERT_BANNER', payload: updated });
          toast('تم تحديث البانر بنجاح');
        } else {
          const created = await services.banners.create(data);
          dispatch({ type: 'UPSERT_BANNER', payload: created });
          toast('تم إضافة البانر بنجاح');
        }
        dispatch({ type: 'MARK_SAVED' });
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل حفظ البانر', 'error');
        return false;
      }
    },

    async remove(id: string) {
      try {
        await services.banners.remove(id);
        dispatch({ type: 'REMOVE_BANNER', payload: id });
        toast('تم حذف البانر', 'info');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل حذف البانر', 'error');
        return false;
      }
    },

    async toggle(id: string, enabled: boolean) {
      try {
        const updated = await services.banners.toggle(id, enabled);
        dispatch({ type: 'UPSERT_BANNER', payload: updated });
        toast(enabled ? 'تم إظهار البانر' : 'تم إخفاء البانر');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل تغيير حالة البانر', 'error');
        return false;
      }
    },

    async move(_index: number, _direction: 'up' | 'down') { return false; },

    async moveWithItems(sortedBanners: Banner[], index: number, direction: 'up' | 'down') {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const items = services.banners.buildSwappedOrder(sortedBanners, index, swapIndex);
      if (!items.length) return false;
      try {
        await services.banners.reorder(items);
        const fresh = await services.banners.getAll();
        dispatch({ type: 'SET_BANNERS', payload: fresh });
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل إعادة الترتيب', 'error');
        return false;
      }
    },

    async uploadImage(id: string, file: File) {
      const validation = services.media.validate(file);
      if (!validation.valid) { toast(validation.error!, 'error'); return false; }
      dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: 0, status: 'uploading' } });
      try {
        const updated = await services.media.uploadBannerImage<Banner>(id, file, (p) => {
          dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: p, status: 'uploading' } });
        });
        dispatch({ type: 'UPSERT_BANNER', payload: updated });
        dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: 100, status: 'done' } });
        toast('تم رفع الصورة بنجاح');
        setTimeout(() => dispatch({ type: 'CLEAR_UPLOAD', payload: id }), 1500);
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: 0, status: 'error', error: msg } });
        toast(msg || 'فشل رفع الصورة', 'error');
        setTimeout(() => dispatch({ type: 'CLEAR_UPLOAD', payload: id }), 3000);
        return false;
      }
    },
  }), [services, toast]);

  // ── Category actions ────────────────────────────────────────────────────────

  const categoryActions = useMemo(() => ({
    async save(data: CategoryFormData) {
      try {
        if (data.id) {
          const updated = await services.categories.update(data.id, data);
          dispatch({ type: 'UPSERT_CATEGORY', payload: updated });
          toast('تم تحديث التصنيف بنجاح');
        } else {
          const created = await services.categories.create(data);
          dispatch({ type: 'UPSERT_CATEGORY', payload: created });
          toast('تم إضافة التصنيف بنجاح');
        }
        dispatch({ type: 'MARK_SAVED' });
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل حفظ التصنيف', 'error');
        return false;
      }
    },

    async remove(id: string) {
      try {
        await services.categories.remove(id);
        dispatch({ type: 'REMOVE_CATEGORY', payload: id });
        toast('تم حذف التصنيف', 'info');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل حذف التصنيف', 'error');
        return false;
      }
    },

    async toggle(id: string, enabled: boolean) {
      try {
        const updated = await services.categories.toggle(id, enabled);
        dispatch({ type: 'UPSERT_CATEGORY', payload: updated });
        toast(enabled ? 'تم إظهار التصنيف' : 'تم إخفاء التصنيف');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل تغيير حالة التصنيف', 'error');
        return false;
      }
    },

    async move(_index: number, _direction: 'up' | 'down') { return false; },

    async moveWithItems(sortedCategories: Category[], index: number, direction: 'up' | 'down') {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const items = services.categories.buildSwappedOrder(sortedCategories, index, swapIndex);
      if (!items.length) return false;
      try {
        await services.categories.reorder(items);
        const fresh = await services.categories.getAll();
        dispatch({ type: 'SET_CATEGORIES', payload: fresh });
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل إعادة الترتيب', 'error');
        return false;
      }
    },

    async uploadImage(id: string, file: File) {
      const validation = services.media.validate(file);
      if (!validation.valid) { toast(validation.error!, 'error'); return false; }
      dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: 0, status: 'uploading' } });
      try {
        const updated = await services.media.uploadCategoryImage<Category>(id, file, (p) => {
          dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: p, status: 'uploading' } });
        });
        dispatch({ type: 'UPSERT_CATEGORY', payload: updated });
        dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: 100, status: 'done' } });
        toast('تم رفع الصورة بنجاح');
        setTimeout(() => dispatch({ type: 'CLEAR_UPLOAD', payload: id }), 1500);
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        dispatch({ type: 'SET_UPLOAD', payload: { entityId: id, progress: 0, status: 'error', error: msg } });
        toast(msg || 'فشل رفع الصورة', 'error');
        setTimeout(() => dispatch({ type: 'CLEAR_UPLOAD', payload: id }), 3000);
        return false;
      }
    },
  }), [services, toast]);

  // ── Featured store actions ──────────────────────────────────────────────────

  const featuredActions = useMemo(() => ({
    async pin(merchantId: string, sortOrder: number) {
      try {
        const created = await services.featuredStores.pin(merchantId, sortOrder);
        dispatch({ type: 'UPSERT_FEATURED', payload: created });
        toast('تم تمييز المتجر');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل تمييز المتجر', 'error');
        return false;
      }
    },

    async unpin(id: string) {
      try {
        await services.featuredStores.unpin(id);
        dispatch({ type: 'REMOVE_FEATURED', payload: id });
        toast('تم إلغاء التمييز', 'info');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل إلغاء التمييز', 'error');
        return false;
      }
    },

    async toggle(id: string, enabled: boolean) {
      try {
        const updated = await services.featuredStores.toggle(id, enabled);
        dispatch({ type: 'UPSERT_FEATURED', payload: updated });
        toast(enabled ? 'تم إظهار المتجر' : 'تم إخفاء المتجر');
        return true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(msg || 'فشل تغيير حالة المتجر', 'error');
        return false;
      }
    },
  }), [services, toast]);

  return {
    state,
    loadAll,
    bannerActions,
    categoryActions,
    featuredActions,
  };
}
