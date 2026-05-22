'use client';
// ══════════════════════════════════════════════════════════════════════════════
// HomeCmsPage — production-grade CMS page built from modular components
// ══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useCmsStore } from '../hooks/useCmsStore';
import { BannerCard } from '../components/BannerCard';
import { CategoryCard } from '../components/CategoryCard';
import { MobilePreview } from '../preview/MobilePreview';
import type { BannerFormData, CategoryFormData } from '../types';

// Default colour-palette gradient — used for new banners
const DEFAULT_BANNER: Omit<BannerFormData, 'id'> = {
  title: 'بانر جديد',
  subtitle: '',
  buttonText: 'تسوق الآن',
  imageUrl: '',
  color1: '#D4A437',
  color2: '#8B4513',
  enabled: true,
  sortOrder: 999,
};

const DEFAULT_CATEGORY: Omit<CategoryFormData, 'id'> = {
  name: 'تصنيف جديد',
  iconEmoji: '🏷️',
  colorHex: '#D4A437',
  imageUrl: '',
  enabled: true,
  sortOrder: 999,
};

interface HomeCmsPanelProps {
  token: string;
  apiBase: string;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type Tab = 'banners' | 'categories' | 'stores';

export function HomeCmsPage({ token, apiBase, onToast }: HomeCmsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('banners');
  const [addingBanner, setAddingBanner] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);

  const { state, loadAll, bannerActions, categoryActions, featuredActions } = useCmsStore({
    baseUrl: apiBase,
    token,
    onToast,
  });

  useEffect(() => { loadAll(); }, [loadAll]);

  const sortedBanners = [...state.banners].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedCategories = [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedFeatured = [...state.featuredStores].sort((a, b) => a.sortOrder - b.sortOrder);

  const activeBanners = sortedBanners.filter(b => b.enabled).length;
  const activeCategories = sortedCategories.filter(c => c.enabled).length;

  // ── Quick create helpers ───────────────────────────────────────────────────

  const quickCreateBanner = async () => {
    if (!newBannerTitle.trim()) return;
    setCreating(true);
    await bannerActions.save({ ...DEFAULT_BANNER, title: newBannerTitle.trim() });
    setCreating(false);
    setAddingBanner(false);
    setNewBannerTitle('');
  };

  const quickCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreating(true);
    await categoryActions.save({ ...DEFAULT_CATEGORY, name: newCategoryName.trim() });
    setCreating(false);
    setAddingCategory(false);
    setNewCategoryName('');
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 10, fontFamily: 'Cairo', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', border: 'none',
    background: active ? 'linear-gradient(135deg, var(--gold), var(--orange))' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text)',
    boxShadow: active ? '0 2px 8px rgba(212,164,55,0.3)' : 'none',
    transition: 'all 0.2s',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* ── Main column ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'إجمالي البنرات', value: state.banners.length, icon: '🖼️', color: '#D4A437' },
            { label: 'بنرات نشطة', value: activeBanners, icon: '✅', color: '#22c55e' },
            { label: 'التصنيفات', value: state.categories.length, icon: '🏷️', color: '#3b82f6' },
            { label: 'تصنيفات نشطة', value: activeCategories, icon: '📂', color: '#8b5cf6' },
            { label: 'متاجر مميزة', value: state.featuredStores.length, icon: '⭐', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', border: '1.5px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Cairo', fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <button style={tabStyle(activeTab === 'banners')} onClick={() => setActiveTab('banners')}>🖼️ البنرات ({state.banners.length})</button>
          <button style={tabStyle(activeTab === 'categories')} onClick={() => setActiveTab('categories')}>🏷️ التصنيفات ({state.categories.length})</button>
          <button style={tabStyle(activeTab === 'stores')} onClick={() => setActiveTab('stores')}>⭐ المتاجر المميزة ({state.featuredStores.length})</button>

          <div style={{ marginRight: 'auto', display: 'flex', gap: 10 }}>
            {activeTab === 'banners' && (
              <button onClick={() => setAddingBanner(v => !v)}
                style={{ ...tabStyle(false), background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff' }}>
                + بانر جديد
              </button>
            )}
            {activeTab === 'categories' && (
              <button onClick={() => setAddingCategory(v => !v)}
                style={{ ...tabStyle(false), background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff' }}>
                + تصنيف جديد
              </button>
            )}
            <button onClick={loadAll} title="تحديث" style={{ ...tabStyle(false), padding: '8px 12px' }}>🔄</button>
          </div>
        </div>

        {/* Loading */}
        {state.loading && (
          <div style={{ textAlign: 'center', padding: 40, fontFamily: 'Cairo', color: 'var(--text-muted)' }}>⏳ جاري التحميل...</div>
        )}

        {/* Error */}
        {state.error && (
          <div style={{ background: '#ff444411', border: '1px solid #ff444444', borderRadius: 10, padding: '12px 16px', fontFamily: 'Cairo', color: '#ff4444', marginBottom: 16 }}>
            ⚠️ {state.error}
          </div>
        )}

        {/* ── BANNERS TAB ── */}
        {activeTab === 'banners' && !state.loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Quick-add form */}
            {addingBanner && (
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--gold)', borderRadius: 14, padding: 16 }} dir="rtl">
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>بانر جديد</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={newBannerTitle}
                    onChange={e => setNewBannerTitle(e.target.value)}
                    placeholder="عنوان البانر"
                    onKeyDown={e => e.key === 'Enter' && quickCreateBanner()}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo', fontSize: 14, outline: 'none' }}
                  />
                  <button onClick={quickCreateBanner} disabled={creating || !newBannerTitle.trim()}
                    style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff', fontFamily: 'Cairo', fontWeight: 700, opacity: creating ? 0.7 : 1 }}>
                    {creating ? '...' : 'إضافة'}
                  </button>
                  <button onClick={() => setAddingBanner(false)} style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo' }}>
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {sortedBanners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: 'var(--card)', borderRadius: 16, border: '2px dashed var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>لا توجد بنرات بعد</div>
                <div style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--text-muted)' }}>أضف أول بانر للصفحة الرئيسية</div>
              </div>
            ) : sortedBanners.map((banner, index) => (
              <BannerCard
                key={banner.id}
                banner={banner}
                index={index}
                total={sortedBanners.length}
                uploadProgress={state.uploads[banner.id]}
                onSave={bannerActions.save}
                onDelete={bannerActions.remove}
                onToggle={bannerActions.toggle}
                onMove={(idx, dir) => bannerActions.moveWithItems(sortedBanners, idx, dir)}
                onUploadImage={bannerActions.uploadImage}
              />
            ))}
          </div>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === 'categories' && !state.loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {addingCategory && (
              <div style={{ background: 'var(--card)', border: '1.5px solid var(--gold)', borderRadius: 14, padding: 16 }} dir="rtl">
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>تصنيف جديد</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="اسم التصنيف"
                    onKeyDown={e => e.key === 'Enter' && quickCreateCategory()}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo', fontSize: 14, outline: 'none' }}
                  />
                  <button onClick={quickCreateCategory} disabled={creating || !newCategoryName.trim()}
                    style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff', fontFamily: 'Cairo', fontWeight: 700, opacity: creating ? 0.7 : 1 }}>
                    {creating ? '...' : 'إضافة'}
                  </button>
                  <button onClick={() => setAddingCategory(false)} style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo' }}>
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {sortedCategories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: 'var(--card)', borderRadius: 16, border: '2px dashed var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>لا توجد تصنيفات</div>
              </div>
            ) : sortedCategories.map((cat, index) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                index={index}
                total={sortedCategories.length}
                uploadProgress={state.uploads[cat.id]}
                onSave={categoryActions.save}
                onDelete={categoryActions.remove}
                onToggle={categoryActions.toggle}
                onMove={(idx, dir) => categoryActions.moveWithItems(sortedCategories, idx, dir)}
                onUploadImage={categoryActions.uploadImage}
              />
            ))}
          </div>
        )}

        {/* ── FEATURED STORES TAB ── */}
        {activeTab === 'stores' && !state.loading && (
          <div>
            {/* Unpin existing */}
            {sortedFeatured.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>
                  المتاجر المميزة الحالية
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {sortedFeatured.map(fs => (
                    <div key={fs.id} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                      {fs.merchant?.logoUrl ? (
                        <img src={fs.merchant.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{fs.merchant?.storeName ?? 'متجر'}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button onClick={() => featuredActions.toggle(fs.id, !fs.enabled)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: fs.enabled ? '#ff444422' : '#22c55e22', color: fs.enabled ? '#ff4444' : '#22c55e', fontFamily: 'Cairo', fontSize: 11 }}>
                            {fs.enabled ? 'إخفاء' : 'إظهار'}
                          </button>
                          <button onClick={() => featuredActions.unpin(fs.id)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: '1.5px solid #ff444444', cursor: 'pointer', background: 'transparent', color: '#ff4444', fontFamily: 'Cairo', fontSize: 11 }}>
                            إزالة ⭐
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pin new merchants */}
            {state.merchants.length > 0 && (
              <div>
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>إضافة متاجر مميزة</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {state.merchants
                    .filter(m => !sortedFeatured.some(f => f.merchantId === m.id))
                    .map(m => (
                      <div key={m.id} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                        {m.logoUrl ? (
                          <img src={m.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{m.storeName}</div>
                          <button onClick={() => featuredActions.pin(m.id, state.featuredStores.length + 1)}
                            style={{ marginTop: 4, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700 }}>
                            ⭐ تمييز
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {state.merchants.length === 0 && sortedFeatured.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, background: 'var(--card)', borderRadius: 16, border: '2px dashed var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
                <div style={{ fontFamily: 'Cairo', fontWeight: 700, color: 'var(--text)' }}>لا توجد متاجر موافق عليها بعد</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Side: Mobile Preview ── */}
      <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 20 }}>
        <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>
          معاينة الصفحة الرئيسية
        </div>
        <MobilePreview banners={state.banners} categories={state.categories} />
      </div>
    </div>
  );
}
