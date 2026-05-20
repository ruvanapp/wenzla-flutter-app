'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  imageUrl?: string;
  color1: string;
  color2: string;
  sortOrder: number;
  enabled: boolean;
};

type Category = {
  id: string;
  name: string;
  iconEmoji?: string;
  imageUrl?: string;
  colorHex?: string;
  sortOrder: number;
  enabled: boolean;
};

type FeaturedStore = {
  id: string;
  sortOrder: number;
  enabled: boolean;
  merchant: {
    id: string;
    storeName: string;
    logoUrl?: string;
    bannerUrl?: string;
    status?: string;
  };
};

type Merchant = {
  id: string;
  storeName: string;
  logoUrl?: string;
  status?: string;
};

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

type Tab = 'banners' | 'categories' | 'featured' | 'promotions' | 'sections';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  token: string;
  apiUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ── Mobile Preview ─────────────────────────────────────────────────────────────

function MobilePreview({ banners, categories }: { banners: Banner[]; categories: Category[] }) {
  const [slide, setSlide] = useState(0);
  const activeBanners = banners.filter(b => b.enabled);
  const activeCategories = categories.filter(c => c.enabled);

  useEffect(() => {
    if (activeBanners.length < 2) return;
    const t = setInterval(() => setSlide(p => (p + 1) % activeBanners.length), 2500);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  return (
    <div style={{ position: 'sticky', top: 80, width: 220, flexShrink: 0 }}>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontFamily: 'Cairo' }}>
        معاينة مباشرة على الجوال
      </div>
      {/* Phone frame */}
      <div style={{
        width: 220, height: 440, background: '#f8f5f0', borderRadius: 28,
        border: '3px solid #222', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden',
        position: 'relative', fontFamily: 'Cairo',
      }}>
        {/* Status bar */}
        <div style={{ height: 22, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
          <span style={{ color: '#fff', fontSize: 8 }}>9:41</span>
          <div style={{ width: 40, height: 6, background: '#333', borderRadius: 3 }} />
          <span style={{ color: '#fff', fontSize: 8 }}>100%</span>
        </div>
        {/* App header */}
        <div style={{ background: '#fff', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>سوق العسل</span>
          <span style={{ fontSize: 14 }}>🍯</span>
        </div>
        {/* Banner slider */}
        <div style={{ height: 110, overflow: 'hidden', position: 'relative', background: '#ddd' }}>
          {activeBanners.length === 0 ? (
            <div style={{ height: '100%', background: `linear-gradient(135deg, #D4A437, #8B4513)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 10, opacity: 0.7 }}>لا توجد بانرات</span>
            </div>
          ) : (
            activeBanners.map((b, i) => (
              <div key={b.id} style={{
                position: 'absolute', inset: 0, transition: 'opacity 0.5s',
                opacity: i === slide ? 1 : 0,
              }}>
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${b.color1}, ${b.color2})` }} />
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                }}>
                  <div style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{b.title}</div>
                  {b.subtitle && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 7.5 }}>{b.subtitle}</div>}
                </div>
              </div>
            ))
          )}
          {/* Dots */}
          {activeBanners.length > 1 && (
            <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3 }}>
              {activeBanners.map((_, i) => (
                <div key={i} style={{ width: i === slide ? 12 : 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.9)', transition: 'width 0.3s' }} />
              ))}
            </div>
          )}
        </div>
        {/* Categories */}
        <div style={{ padding: '6px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1a1a2e', marginBottom: 4, textAlign: 'right' }}>التصنيفات</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {activeCategories.length === 0 ? (
              <div style={{ fontSize: 8, color: '#999' }}>لا توجد تصنيفات</div>
            ) : activeCategories.slice(0, 5).map(c => (
              <div key={c.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, overflow: 'hidden',
                  background: c.colorHex || '#D4A437',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 16 }}>{c.iconEmoji || '🍯'}</span>
                  }
                </div>
                <span style={{ fontSize: 7, color: '#333', maxWidth: 36, textAlign: 'center', wordBreak: 'break-word' }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Stores placeholder */}
        <div style={{ padding: '2px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1a1a2e', marginBottom: 4, textAlign: 'right' }}>متاجر مميزة</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ width: 64, height: 56, background: '#eee', borderRadius: 8, flexShrink: 0 }} />
            ))}
          </div>
        </div>
        {/* Bottom nav */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
          background: '#fff', borderTop: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        }}>
          {['🏠', '🛒', '📋', '👤'].map((icon, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: 12 }}>{icon}</span>
              <div style={{ width: i === 0 ? 20 : 14, height: 2, borderRadius: 1, background: i === 0 ? '#D4A437' : '#ccc' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Toast Container ────────────────────────────────────────────────────────────

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  return (
    <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: colors[t.type], color: '#fff', padding: '10px 16px',
          borderRadius: 10, fontFamily: 'Cairo', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          animation: 'slideIn 0.25s ease-out',
          pointerEvents: 'auto',
          minWidth: 220, maxWidth: 320,
        }}>
          <span style={{ fontSize: 15 }}>{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Image Upload Zone ──────────────────────────────────────────────────────────

function ImageUploadZone({
  currentUrl, onUpload, loading, label,
}: {
  currentUrl?: string; onUpload: (file: File) => void; loading: boolean; label?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onUpload(file);
  }

  return (
    <div>
      {label && <label style={{ display: 'block', marginBottom: 6, fontFamily: 'Cairo', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(212,164,55,0.08)' : 'var(--surface)',
          transition: 'all 0.2s', position: 'relative', minHeight: 100,
        }}
      >
        {loading ? (
          <div style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>
            <div className="spin" style={{ fontSize: 20, display: 'inline-block' }}>↺</div>
            <div style={{ marginTop: 4 }}>جاري الرفع…</div>
          </div>
        ) : currentUrl ? (
          <div>
            <img src={currentUrl} alt="preview" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', fontFamily: 'Cairo' }}>انقر أو اسحب لتغيير الصورة</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>انقر أو اسحب صورة هنا</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>PNG, JPG, WEBP</div>
          </div>
        )}
        <input
          ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

// ── Skeleton Loader ────────────────────────────────────────────────────────────

function Skeleton({ width = '100%', height = 20, radius = 8 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

// ── Banner Card ────────────────────────────────────────────────────────────────

function BannerCard({
  banner, index, total,
  onEdit, onDelete, onToggle, onMoveUp, onMoveDown, onUpload, uploadingId,
}: {
  banner: Banner; index: number; total: number;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onUpload: (file: File) => void; uploadingId: string | null;
}) {
  const uploading = uploadingId === banner.id;

  return (
    <div style={{
      background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      opacity: banner.enabled ? 1 : 0.6,
      transition: 'opacity 0.2s, transform 0.15s',
    }}>
      {/* Banner image preview */}
      <div style={{ height: 140, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${banner.color1 || '#D4A437'}, ${banner.color2 || '#8B4513'})`, flexShrink: 0 }}>
        {banner.imageUrl && (
          <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{
          position: 'absolute', inset: 0, padding: 14,
          background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.65))',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div style={{ color: '#fff', fontFamily: 'Cairo', fontSize: 15, fontWeight: 800 }}>{banner.title}</div>
          {banner.subtitle && <div style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Cairo', fontSize: 12, marginTop: 2 }}>{banner.subtitle}</div>}
          {banner.buttonText && (
            <div style={{
              marginTop: 6, alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)',
              color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'Cairo',
            }}>{banner.buttonText}</div>
          )}
        </div>
        {/* Order badge */}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontFamily: 'Cairo' }}>
          #{index + 1}
        </div>
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: banner.enabled ? 'rgba(22,163,74,0.9)' : 'rgba(100,100,100,0.9)',
          color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontFamily: 'Cairo',
        }}>
          {banner.enabled ? 'نشط' : 'مخفي'}
        </div>
        {/* Image upload zone overlay */}
        <label style={{
          position: 'absolute', bottom: 10, right: 10,
          background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '4px 10px',
          cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4, color: '#333',
        }}>
          {uploading ? '…' : '📷 تغيير الصورة'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      </div>
      {/* Card footer */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={iconBtn} title="تحريك لأعلى">↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtn} title="تحريك لأسفل">↓</button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Toggle */}
          <button onClick={onToggle} style={{
            ...iconBtn,
            background: banner.enabled ? 'rgba(22,163,74,0.15)' : 'rgba(100,100,100,0.1)',
            color: banner.enabled ? '#16a34a' : '#666',
            fontFamily: 'Cairo', fontSize: 11, padding: '4px 10px', borderRadius: 20,
          }}>
            {banner.enabled ? 'إخفاء' : 'إظهار'}
          </button>
          <button onClick={onEdit} style={{ ...iconBtn, color: '#2563eb' }}>✏️ تعديل</button>
          <button onClick={onDelete} style={{ ...iconBtn, color: '#dc2626' }}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ── Category Card ─────────────────────────────────────────────────────────────

function CategoryCard({
  category, index, total,
  onEdit, onDelete, onToggle, onMoveUp, onMoveDown, onUpload, uploadingId,
}: {
  category: Category; index: number; total: number;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onUpload: (file: File) => void; uploadingId: string | null;
}) {
  const uploading = uploadingId === category.id;
  return (
    <div style={{
      background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      opacity: category.enabled ? 1 : 0.55,
    }}>
      {/* Icon / image */}
      <div style={{
        width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
        background: category.colorHex || '#D4A437',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        position: 'relative',
      }}>
        {category.imageUrl ? (
          <img src={category.imageUrl} alt={category.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{category.iconEmoji || '🏷️'}</span>
        )}
        <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', opacity: 0 }}>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
        </label>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{category.name}</div>
        <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>#{index + 1}</span>
          {uploading && <span style={{ color: 'var(--gold)' }}>جاري الرفع…</span>}
          {category.colorHex && <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: category.colorHex, border: '1px solid #ccc' }} />}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={onMoveUp} disabled={index === 0} style={iconBtn}>↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={iconBtn}>↓</button>
        <button onClick={onToggle} style={{ ...iconBtn, color: category.enabled ? '#16a34a' : '#999', fontSize: 11, padding: '3px 8px', borderRadius: 16, fontFamily: 'Cairo' }}>
          {category.enabled ? '👁️' : '🙈'}
        </button>
        <button onClick={onEdit} style={{ ...iconBtn, color: '#2563eb' }}>✏️</button>
        <button onClick={onDelete} style={{ ...iconBtn, color: '#dc2626' }}>🗑️</button>
      </div>
    </div>
  );
}

// ── Icon button style ──────────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 8,
  padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: 'var(--text)',
  fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
};

// ── Stats Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'Cairo', fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Banner Form Modal ──────────────────────────────────────────────────────────

function BannerFormModal({
  initial, onSave, onClose,
}: {
  initial?: Partial<Banner>; onSave: (data: Partial<Banner>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Banner>>({
    title: '', subtitle: '', buttonText: '', color1: '#D4A437', color2: '#8B4513', enabled: true,
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title?.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Cairo' }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{initial?.id ? 'تعديل البانر' : 'إضافة بانر جديد'}</h3>
          <button onClick={onClose} style={{ ...iconBtn, border: 'none', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>العنوان *</label>
            <input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="عنوان البانر" />
          </div>
          <div>
            <label style={labelStyle}>النص الفرعي</label>
            <input value={form.subtitle || ''} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} style={inputStyle} placeholder="نص توضيحي" />
          </div>
          <div>
            <label style={labelStyle}>نص زر الإجراء</label>
            <input value={form.buttonText || ''} onChange={e => setForm(p => ({ ...p, buttonText: e.target.value }))} style={inputStyle} placeholder="مثال: تسوق الآن" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>لون البداية</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color1 || '#D4A437'} onChange={e => setForm(p => ({ ...p, color1: e.target.value }))} style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                <input value={form.color1 || '#D4A437'} onChange={e => setForm(p => ({ ...p, color1: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>لون النهاية</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color2 || '#8B4513'} onChange={e => setForm(p => ({ ...p, color2: e.target.value }))} style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                <input value={form.color2 || '#8B4513'} onChange={e => setForm(p => ({ ...p, color2: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
          </div>
          {/* Live mini preview of gradient */}
          <div style={{
            height: 60, borderRadius: 12,
            background: `linear-gradient(135deg, ${form.color1 || '#D4A437'}, ${form.color2 || '#8B4513'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700 }}>{form.title || 'معاينة'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="bannerEnabled" checked={form.enabled ?? true} onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))} style={{ width: 16, height: 16 }} />
            <label htmlFor="bannerEnabled" style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>نشط (مرئي في التطبيق)</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving || !form.title?.trim()} style={primaryBtn}>
            {saving ? 'جاري الحفظ…' : '💾 حفظ البانر'}
          </button>
          <button onClick={onClose} style={secondaryBtn}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ── Category Form Modal ────────────────────────────────────────────────────────

function CategoryFormModal({
  initial, onSave, onClose,
}: {
  initial?: Partial<Category>; onSave: (data: Partial<Category>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Category>>({
    name: '', iconEmoji: '🍯', colorHex: '#D4A437', enabled: true,
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const emojiOptions = ['🍯', '🐝', '🌿', '🫙', '🌸', '🍃', '🧴', '🌾', '💊', '🌰', '🍋', '🫚'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Cairo' }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>{initial?.id ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</h3>
          <button onClick={onClose} style={{ ...iconBtn, border: 'none', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: form.colorHex || '#D4A437',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            }}>
              {form.iconEmoji || '🏷️'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>اسم التصنيف *</label>
            <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="مثال: عسل طبيعي" />
          </div>
          <div>
            <label style={labelStyle}>الأيقونة (emoji)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {emojiOptions.map(e => (
                <button key={e} onClick={() => setForm(p => ({ ...p, iconEmoji: e }))} style={{
                  fontSize: 22, padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
                  border: form.iconEmoji === e ? '2px solid var(--gold)' : '1px solid var(--border)',
                  background: form.iconEmoji === e ? 'rgba(212,164,55,0.1)' : 'var(--surface)',
                }}>
                  {e}
                </button>
              ))}
            </div>
            <input value={form.iconEmoji || ''} onChange={e => setForm(p => ({ ...p, iconEmoji: e.target.value }))} style={inputStyle} placeholder="أو اكتب emoji مباشرة" />
          </div>
          <div>
            <label style={labelStyle}>لون التصنيف</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.colorHex || '#D4A437'} onChange={e => setForm(p => ({ ...p, colorHex: e.target.value }))} style={{ width: 44, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
              <input value={form.colorHex || '#D4A437'} onChange={e => setForm(p => ({ ...p, colorHex: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="catEnabled" checked={form.enabled ?? true} onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))} style={{ width: 16, height: 16 }} />
            <label htmlFor="catEnabled" style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>نشط (مرئي في التطبيق)</label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving || !form.name?.trim()} style={primaryBtn}>
            {saving ? 'جاري الحفظ…' : '💾 حفظ التصنيف'}
          </button>
          <button onClick={onClose} style={secondaryBtn}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ── Style constants ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5, fontFamily: 'Cairo', fontSize: 13, fontWeight: 600, color: 'var(--text)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff',
  fontFamily: 'Cairo', fontSize: 14, fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 12, border: '1.5px solid var(--border)', cursor: 'pointer',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo', fontSize: 14,
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Main HomeCmsPanel Component ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function HomeCmsPanel({ token, apiUrl }: Props) {
  const { toasts, show: showToast } = useToast();
  const [tab, setTab] = useState<Tab>('banners');
  const [loading, setLoading] = useState(true);

  // Data state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredStores, setFeaturedStores] = useState<FeaturedStore[]>([]);
  const [allMerchants, setAllMerchants] = useState<Merchant[]>([]);

  // Modal state
  const [bannerModal, setBannerModal] = useState<{ open: boolean; initial?: Partial<Banner> }>({ open: false });
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; initial?: Partial<Category> }>({ open: false });

  // Upload loading
  const [uploadingBannerId, setUploadingBannerId] = useState<string | null>(null);
  const [uploadingCategoryId, setUploadingCategoryId] = useState<string | null>(null);

  // ── API helper ───────────────────────────────────────────────────────────────

  async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${apiUrl}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // ── Load all CMS data ────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);
    try {
      const [b, c, f, merch] = await Promise.allSettled([
        apiFetch<Banner[]>('/home-cms/banners'),
        apiFetch<Category[]>('/home-cms/categories'),
        apiFetch<FeaturedStore[]>('/home-cms/featured-stores'),
        apiFetch<Merchant[]>('/home-cms/merchants-list'),
      ]);
      if (b.status === 'fulfilled') setBanners(Array.isArray(b.value) ? b.value : []);
      if (c.status === 'fulfilled') setCategories(Array.isArray(c.value) ? c.value : []);
      if (f.status === 'fulfilled') setFeaturedStores(Array.isArray(f.value) ? f.value : []);
      if (merch.status === 'fulfilled') setAllMerchants(Array.isArray(merch.value) ? merch.value : []);
    } catch (e) {
      showToast('خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) loadAll(); }, [token]);

  // ── Banner operations ─────────────────────────────────────────────────────────

  async function saveBanner(data: Partial<Banner>) {
    try {
      if (data.id) {
        await apiFetch(`/home-cms/banners/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        showToast('تم تحديث البانر بنجاح');
      } else {
        await apiFetch('/home-cms/banners', { method: 'POST', body: JSON.stringify(data) });
        showToast('تم إضافة البانر بنجاح');
      }
      setBannerModal({ open: false });
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function deleteBanner(id: string) {
    if (!confirm('هل تريد حذف هذا البانر نهائياً؟')) return;
    try {
      await apiFetch(`/home-cms/banners/${id}`, { method: 'DELETE' });
      showToast('تم حذف البانر', 'info');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function toggleBanner(b: Banner) {
    try {
      await apiFetch(`/home-cms/banners/${b.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !b.enabled }) });
      showToast(b.enabled ? 'تم إخفاء البانر' : 'تم إظهار البانر');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function uploadBannerImage(id: string, file: File) {
    setUploadingBannerId(id);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${apiUrl}/home-cms/banners/${id}/image`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (res.ok) { showToast('تم رفع الصورة بنجاح'); loadAll(); }
      else showToast('فشل رفع الصورة', 'error');
    } catch (e) { showToast(String(e), 'error'); }
    finally { setUploadingBannerId(null); }
  }

  async function moveBanner(index: number, direction: 'up' | 'down') {
    const sorted = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const a = sorted[index], b = sorted[swapIndex];
    const items = sorted.map((item, i) => {
      if (i === index) return { id: item.id, sortOrder: b.sortOrder };
      if (i === swapIndex) return { id: item.id, sortOrder: a.sortOrder };
      return { id: item.id, sortOrder: item.sortOrder };
    });
    try {
      await apiFetch('/home-cms/banners/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  // ── Category operations ────────────────────────────────────────────────────────

  async function saveCategory(data: Partial<Category>) {
    try {
      if (data.id) {
        await apiFetch(`/home-cms/categories/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        showToast('تم تحديث التصنيف بنجاح');
      } else {
        await apiFetch('/home-cms/categories', { method: 'POST', body: JSON.stringify(data) });
        showToast('تم إضافة التصنيف بنجاح');
      }
      setCategoryModal({ open: false });
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function deleteCategory(id: string) {
    if (!confirm('هل تريد حذف هذا التصنيف؟')) return;
    try {
      await apiFetch(`/home-cms/categories/${id}`, { method: 'DELETE' });
      showToast('تم حذف التصنيف', 'info');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function toggleCategory(c: Category) {
    try {
      await apiFetch(`/home-cms/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !c.enabled }) });
      showToast(c.enabled ? 'تم إخفاء التصنيف' : 'تم إظهار التصنيف');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function uploadCategoryImage(id: string, file: File) {
    setUploadingCategoryId(id);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${apiUrl}/home-cms/categories/${id}/image`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (res.ok) { showToast('تم رفع الصورة بنجاح'); loadAll(); }
      else showToast('فشل رفع الصورة', 'error');
    } catch (e) { showToast(String(e), 'error'); }
    finally { setUploadingCategoryId(null); }
  }

  async function moveCategory(index: number, direction: 'up' | 'down') {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const a = sorted[index], b = sorted[swapIndex];
    const items = sorted.map((item, i) => {
      if (i === index) return { id: item.id, sortOrder: b.sortOrder };
      if (i === swapIndex) return { id: item.id, sortOrder: a.sortOrder };
      return { id: item.id, sortOrder: item.sortOrder };
    });
    try {
      await apiFetch('/home-cms/categories/reorder', { method: 'PUT', body: JSON.stringify({ items }) });
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  // ── Featured store operations ──────────────────────────────────────────────────

  async function pinStore(merchantId: string) {
    try {
      await apiFetch('/home-cms/featured-stores', { method: 'POST', body: JSON.stringify({ merchantId, sortOrder: featuredStores.length + 1 }) });
      showToast('تم تمييز المتجر');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function unpinStore(id: string) {
    try {
      await apiFetch(`/home-cms/featured-stores/${id}`, { method: 'DELETE' });
      showToast('تم إلغاء تمييز المتجر', 'info');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  async function toggleFeaturedStore(fs: FeaturedStore) {
    try {
      await apiFetch(`/home-cms/featured-stores/${fs.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !fs.enabled }) });
      showToast(fs.enabled ? 'تم إخفاء المتجر' : 'تم إظهار المتجر');
      loadAll();
    } catch (e) { showToast(String(e), 'error'); }
  }

  // ── Computed ────────────────────────────────────────────────────────────────────

  const sortedBanners = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const pinnedIds = new Set(featuredStores.map(f => f.merchant?.id).filter(Boolean));
  const unpinnedMerchants = allMerchants.filter(m => !pinnedIds.has(m.id));

  // ── Stats ───────────────────────────────────────────────────────────────────────

  const stats = {
    totalBanners: banners.length,
    activeBanners: banners.filter(b => b.enabled).length,
    totalCategories: categories.length,
    featuredStores: featuredStores.filter(f => f.enabled).length,
  };

  // ── Tabs ────────────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: 'banners', label: 'البانرات', icon: '🖼️', count: banners.length },
    { key: 'categories', label: 'التصنيفات', icon: '🏷️', count: categories.length },
    { key: 'featured', label: 'متاجر مميزة', icon: '⭐', count: featuredStores.length },
    { key: 'promotions', label: 'العروض', icon: '🎁' },
    { key: 'sections', label: 'الأقسام', icon: '📐' },
  ];

  // ── CSS injected once ────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; display: inline-block; }
        .cms-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.1) !important; }
      `}</style>

      <ToastContainer toasts={toasts} />

      {/* Modals */}
      {bannerModal.open && (
        <BannerFormModal
          initial={bannerModal.initial}
          onSave={async (data) => { await saveBanner({ ...bannerModal.initial, ...data }); }}
          onClose={() => setBannerModal({ open: false })}
        />
      )}
      {categoryModal.open && (
        <CategoryFormModal
          initial={categoryModal.initial}
          onSave={async (data) => { await saveCategory({ ...categoryModal.initial, ...data }); }}
          onClose={() => setCategoryModal({ open: false })}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} dir="rtl">
        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Cairo', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              🏠 إدارة محتوى الرئيسية
            </h2>
            <p style={{ margin: '4px 0 0', fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>
              تحكم في البانرات والتصنيفات والمتاجر المميزة بشكل ديناميكي
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadAll} style={secondaryBtn} title="تحديث">🔄 تحديث</button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatCard label="إجمالي البانرات" value={stats.totalBanners} icon="🖼️" color="#D4A437" />
          <StatCard label="بانرات نشطة" value={stats.activeBanners} icon="✅" color="#16a34a" />
          <StatCard label="التصنيفات" value={stats.totalCategories} icon="🏷️" color="#8B4513" />
          <StatCard label="متاجر مميزة" value={stats.featuredStores} icon="⭐" color="#2563eb" />
        </div>

        {/* ── Main content + preview ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Left: CMS editor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 14, padding: 4,
              border: '1px solid var(--border)', overflowX: 'auto',
            }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, minWidth: 80, padding: '8px 12px', border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'Cairo', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                  background: tab === t.key ? 'var(--card)' : 'transparent',
                  color: tab === t.key ? 'var(--gold)' : 'var(--muted)',
                  boxShadow: tab === t.key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.count != null && (
                    <span style={{
                      background: tab === t.key ? 'var(--gold)' : 'var(--border)',
                      color: tab === t.key ? '#fff' : 'var(--muted)',
                      borderRadius: 10, padding: '1px 6px', fontSize: 11,
                    }}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ marginTop: 16 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} height={140} />)}
                </div>
              ) : (
                <>
                  {/* ── Banners Tab ── */}
                  {tab === 'banners' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>
                          {sortedBanners.length} بانر · {sortedBanners.filter(b => b.enabled).length} نشط
                        </div>
                        <button
                          onClick={() => setBannerModal({ open: true, initial: undefined })}
                          style={{ ...primaryBtn, flex: 'unset', padding: '9px 18px' }}
                        >
                          + إضافة بانر
                        </button>
                      </div>
                      {sortedBanners.length === 0 ? (
                        <div style={{
                          textAlign: 'center', padding: '48px 24px', background: 'var(--surface)',
                          borderRadius: 16, border: '2px dashed var(--border)', fontFamily: 'Cairo',
                        }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>لا توجد بانرات</div>
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>أضف أول بانر للصفحة الرئيسية</div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                          {sortedBanners.map((b, i) => (
                            <BannerCard
                              key={b.id}
                              banner={b}
                              index={i}
                              total={sortedBanners.length}
                              onEdit={() => setBannerModal({ open: true, initial: b })}
                              onDelete={() => deleteBanner(b.id)}
                              onToggle={() => toggleBanner(b)}
                              onMoveUp={() => moveBanner(i, 'up')}
                              onMoveDown={() => moveBanner(i, 'down')}
                              onUpload={file => uploadBannerImage(b.id, file)}
                              uploadingId={uploadingBannerId}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Categories Tab ── */}
                  {tab === 'categories' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)' }}>
                          {sortedCategories.length} تصنيف · {sortedCategories.filter(c => c.enabled).length} نشط
                        </div>
                        <button
                          onClick={() => setCategoryModal({ open: true, initial: undefined })}
                          style={{ ...primaryBtn, flex: 'unset', padding: '9px 18px' }}
                        >
                          + إضافة تصنيف
                        </button>
                      </div>
                      {sortedCategories.length === 0 ? (
                        <div style={{
                          textAlign: 'center', padding: '48px 24px', background: 'var(--surface)',
                          borderRadius: 16, border: '2px dashed var(--border)', fontFamily: 'Cairo',
                        }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>لا توجد تصنيفات</div>
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>أضف تصنيفات لظهورها في الصفحة الرئيسية</div>
                        </div>
                      ) : sortedCategories.map((c, i) => (
                        <CategoryCard
                          key={c.id}
                          category={c}
                          index={i}
                          total={sortedCategories.length}
                          onEdit={() => setCategoryModal({ open: true, initial: c })}
                          onDelete={() => deleteCategory(c.id)}
                          onToggle={() => toggleCategory(c)}
                          onMoveUp={() => moveCategory(i, 'up')}
                          onMoveDown={() => moveCategory(i, 'down')}
                          onUpload={file => uploadCategoryImage(c.id, file)}
                          uploadingId={uploadingCategoryId}
                        />
                      ))}
                    </div>
                  )}

                  {/* ── Featured Stores Tab ── */}
                  {tab === 'featured' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Pinned stores */}
                      <div>
                        <div style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                          ⭐ المتاجر المميزة ({featuredStores.length})
                        </div>
                        {featuredStores.length === 0 ? (
                          <div style={{
                            textAlign: 'center', padding: 24, background: 'var(--surface)',
                            borderRadius: 12, border: '2px dashed var(--border)', fontFamily: 'Cairo', fontSize: 13, color: 'var(--muted)',
                          }}>
                            لا توجد متاجر مميزة بعد. اختر متاجر من القائمة أدناه.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {featuredStores.sort((a, b) => a.sortOrder - b.sortOrder).map(fs => (
                              <div key={fs.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12,
                                opacity: fs.enabled ? 1 : 0.6,
                              }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                                  background: '#f3e8c8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {fs.merchant?.logoUrl ? (
                                    <img src={fs.merchant.logoUrl} alt={fs.merchant.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : <span style={{ fontSize: 20 }}>🏪</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{fs.merchant?.storeName}</div>
                                  <div style={{ fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)' }}>
                                    {fs.enabled ? 'نشط' : 'مخفي'} · #{fs.sortOrder}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => toggleFeaturedStore(fs)} style={{ ...iconBtn, fontSize: 11, fontFamily: 'Cairo', padding: '4px 10px', color: fs.enabled ? '#16a34a' : '#999', borderRadius: 16 }}>
                                    {fs.enabled ? '👁️ إخفاء' : '🙈 إظهار'}
                                  </button>
                                  <button onClick={() => unpinStore(fs.id)} style={{ ...iconBtn, color: '#dc2626' }}>🗑️ إلغاء التمييز</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Available merchants */}
                      {unpinnedMerchants.length > 0 && (
                        <div>
                          <div style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                            🏪 متاجر متاحة ({unpinnedMerchants.length})
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                            {unpinnedMerchants.slice(0, 20).map(m => (
                              <div key={m.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                              }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f3e8c8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {m.logoUrl ? (
                                    <img src={m.logoUrl} alt={m.storeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : <span style={{ fontSize: 18 }}>🏪</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: 'Cairo', fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.storeName}</div>
                                </div>
                                <button onClick={() => pinStore(m.id)} style={{ ...iconBtn, color: '#D4A437', border: '1px solid #D4A437', padding: '3px 8px', fontSize: 12, fontFamily: 'Cairo', borderRadius: 16 }}>
                                  ⭐ تمييز
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Promotions / Sections (preserved from original) ── */}
                  {(tab === 'promotions' || tab === 'sections') && (
                    <div style={{
                      textAlign: 'center', padding: '48px 24px', background: 'var(--surface)',
                      borderRadius: 16, border: '1.5px solid var(--border)', fontFamily: 'Cairo',
                    }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'promotions' ? '🎁' : '📐'}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                        {tab === 'promotions' ? 'إدارة العروض' : 'إدارة الأقسام'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                        قريباً · يمكن إدارة {tab === 'promotions' ? 'العروض الترويجية' : 'أقسام الصفحة الرئيسية'} من هنا
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Mobile preview (hidden on small screens) */}
          <div style={{ display: 'none' }} className="cms-preview-panel">
            <MobilePreview banners={sortedBanners} categories={sortedCategories} />
          </div>
          <style>{`
            @media (min-width: 1100px) { .cms-preview-panel { display: block !important; } }
          `}</style>
          <MobilePreview banners={sortedBanners} categories={sortedCategories} />
        </div>
      </div>
    </>
  );
}
