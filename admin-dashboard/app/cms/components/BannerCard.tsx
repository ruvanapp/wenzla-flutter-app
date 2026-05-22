'use client';
// ══════════════════════════════════════════════════════════════════════════════
// BannerCard — individual banner display + inline editing
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import type { Banner, UploadProgress } from '../types';
import type { BannerFormData } from '../types';
import { validateBanner } from '../validators';
import { ImageUploader } from './ImageUploader';
import { inputStyle, labelStyle } from './styles';

interface BannerCardProps {
  banner: Banner;
  index: number;
  total: number;
  uploadProgress?: UploadProgress;
  onSave: (data: BannerFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
  onMove: (index: number, direction: 'up' | 'down') => Promise<boolean>;
  onUploadImage: (id: string, file: File) => Promise<boolean>;
}

export function BannerCard({
  banner, index, total, uploadProgress,
  onSave, onDelete, onToggle, onMove, onUploadImage,
}: BannerCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BannerFormData>({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    buttonText: banner.buttonText ?? '',
    imageUrl: banner.imageUrl ?? '',
    color1: banner.color1 ?? '#D4A437',
    color2: banner.color2 ?? '#8B4513',
    enabled: banner.enabled,
    sortOrder: banner.sortOrder,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleSave = async () => {
    const v = validateBanner(form);
    if (!v.valid) { setErrors(v.errors); return; }
    setErrors({});
    setSaving(true);
    const ok = await onSave(form);
    if (ok && pendingFile) await onUploadImage(banner.id, pendingFile);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <div
      style={{
        border: `1.5px solid ${banner.enabled ? 'var(--border)' : '#ff444433'}`,
        borderRadius: 16, overflow: 'hidden', background: 'var(--card)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <span style={{
          background: banner.enabled ? '#22c55e22' : '#ff444422',
          color: banner.enabled ? '#22c55e' : '#ff4444',
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontFamily: 'Cairo', fontWeight: 700,
        }}>
          {banner.enabled ? 'نشط' : 'مخفي'}
        </span>
        <span style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, flex: 1, color: 'var(--text)' }}>
          {banner.title}
        </span>
        <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--text-muted)' }}>#{index + 1}</span>

        {/* Reorder */}
        <button onClick={() => onMove(index, 'up')} disabled={index === 0}
          style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: 14, opacity: index === 0 ? 0.3 : 1 }}>▲</button>
        <button onClick={() => onMove(index, 'down')} disabled={index === total - 1}
          style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', fontSize: 14, opacity: index === total - 1 ? 0.3 : 1 }}>▼</button>

        {/* Toggle */}
        <button
          onClick={() => onToggle(banner.id, !banner.enabled)}
          style={{
            padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: banner.enabled ? '#ff444422' : '#22c55e22',
            color: banner.enabled ? '#ff4444' : '#22c55e',
            fontFamily: 'Cairo', fontSize: 12,
          }}
        >
          {banner.enabled ? 'إخفاء' : 'إظهار'}
        </button>

        {/* Edit */}
        <button onClick={() => setEditing(e => !e)}
          style={{ padding: '4px 12px', borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', fontFamily: 'Cairo', fontSize: 12, color: 'var(--text)' }}>
          {editing ? 'إلغاء' : '✏️ تعديل'}
        </button>

        {/* Delete */}
        <button onClick={() => onDelete(banner.id)}
          style={{ padding: '4px 12px', borderRadius: 8, border: '1.5px solid #ff444444', cursor: 'pointer', background: 'transparent', color: '#ff4444', fontFamily: 'Cairo', fontSize: 12 }}>
          🗑️
        </button>
      </div>

      {/* Image preview strip */}
      {banner.imageUrl && !editing && (
        <div style={{ maxHeight: 100, overflow: 'hidden' }}>
          <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Inline editor */}
      {editing && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} dir="rtl">
          {/* Title */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>العنوان *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ ...inputStyle, borderColor: errors.title ? '#ff4444' : undefined }} />
            {errors.title && <span style={{ color: '#ff4444', fontSize: 12, fontFamily: 'Cairo' }}>{errors.title}</span>}
          </div>

          {/* Subtitle */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>الوصف</label>
            <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} style={inputStyle} />
          </div>

          {/* CTA */}
          <div>
            <label style={labelStyle}>نص الزر</label>
            <input value={form.buttonText} onChange={e => setForm(f => ({ ...f, buttonText: e.target.value }))} style={inputStyle} />
          </div>

          {/* Sort order */}
          <div>
            <label style={labelStyle}>الترتيب</label>
            <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} style={inputStyle} />
          </div>

          {/* Image upload */}
          <div style={{ gridColumn: '1 / -1' }}>
            <ImageUploader
              currentImageUrl={banner.imageUrl}
              progress={uploadProgress}
              onFileSelected={setPendingFile}
              label="صورة البانر"
            />
          </div>

          {/* Actions */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff',
                fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1,
              }}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ padding: '10px 16px', borderRadius: 12, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'Cairo', fontSize: 14 }}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
