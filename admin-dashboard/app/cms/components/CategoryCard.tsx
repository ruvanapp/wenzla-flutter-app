'use client';
// ══════════════════════════════════════════════════════════════════════════════
// CategoryCard — individual category row with inline editor
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import type { Category, CategoryFormData, UploadProgress } from '../types';
import { validateCategory } from '../validators';
import { ImageUploader } from './ImageUploader';
import { inputStyle, labelStyle } from './styles';

interface CategoryCardProps {
  category: Category;
  index: number;
  total: number;
  uploadProgress?: UploadProgress;
  onSave: (data: CategoryFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => Promise<boolean>;
  onMove: (index: number, direction: 'up' | 'down') => Promise<boolean>;
  onUploadImage: (id: string, file: File) => Promise<boolean>;
}

export function CategoryCard({
  category, index, total, uploadProgress,
  onSave, onDelete, onToggle, onMove, onUploadImage,
}: CategoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CategoryFormData>({
    id: category.id,
    name: category.name,
    iconEmoji: category.iconEmoji ?? '',
    colorHex: category.colorHex ?? '#D4A437',
    imageUrl: category.imageUrl ?? '',
    enabled: category.enabled,
    sortOrder: category.sortOrder,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleSave = async () => {
    const v = validateCategory(form);
    if (!v.valid) { setErrors(v.errors); return; }
    setErrors({});
    setSaving(true);
    const ok = await onSave(form);
    if (ok && pendingFile) await onUploadImage(category.id, pendingFile);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <div style={{
      border: '1.5px solid var(--border)', borderRadius: 14,
      background: 'var(--card)', overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: editing ? '1px solid var(--border)' : 'none' }}>
        {/* Colour dot + emoji */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: category.colorHex ?? '#D4A437', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {category.iconEmoji || '🏷️'}
        </div>

        <span style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, flex: 1, color: 'var(--text)' }}>
          {category.name}
        </span>

        <span style={{
          background: category.enabled ? '#22c55e22' : '#ff444422',
          color: category.enabled ? '#22c55e' : '#ff4444',
          borderRadius: 20, padding: '2px 8px', fontSize: 11, fontFamily: 'Cairo',
        }}>
          {category.enabled ? 'نشط' : 'مخفي'}
        </span>

        {/* Reorder */}
        <button onClick={() => onMove(index, 'up')} disabled={index === 0}
          style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: 13, opacity: index === 0 ? 0.3 : 1 }}>▲</button>
        <button onClick={() => onMove(index, 'down')} disabled={index === total - 1}
          style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', fontSize: 13, opacity: index === total - 1 ? 0.3 : 1 }}>▼</button>

        <button onClick={() => onToggle(category.id, !category.enabled)}
          style={{ padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: category.enabled ? '#ff444422' : '#22c55e22', color: category.enabled ? '#ff4444' : '#22c55e', fontFamily: 'Cairo', fontSize: 12 }}>
          {category.enabled ? 'إخفاء' : 'إظهار'}
        </button>

        <button onClick={() => setEditing(e => !e)}
          style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'var(--surface)', fontFamily: 'Cairo', fontSize: 12, color: 'var(--text)' }}>
          {editing ? 'إلغاء' : '✏️'}
        </button>

        <button onClick={() => onDelete(category.id)}
          style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid #ff444444', cursor: 'pointer', background: 'transparent', color: '#ff4444', fontFamily: 'Cairo', fontSize: 12 }}>
          🗑️
        </button>
      </div>

      {/* Inline editor */}
      {editing && (
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} dir="rtl">
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>اسم التصنيف *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, borderColor: errors.name ? '#ff4444' : undefined }} />
            {errors.name && <span style={{ color: '#ff4444', fontSize: 12, fontFamily: 'Cairo' }}>{errors.name}</span>}
          </div>

          <div>
            <label style={labelStyle}>إيموجي</label>
            <input value={form.iconEmoji} onChange={e => setForm(f => ({ ...f, iconEmoji: e.target.value }))} style={inputStyle} placeholder="🍯" />
          </div>

          <div>
            <label style={labelStyle}>اللون</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
              <input value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} style={{ ...inputStyle, width: 120 }} />
            </div>
            {errors.colorHex && <span style={{ color: '#ff4444', fontSize: 12, fontFamily: 'Cairo' }}>{errors.colorHex}</span>}
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <ImageUploader
              currentImageUrl={category.imageUrl}
              progress={uploadProgress}
              onFileSelected={setPendingFile}
              label="صورة/أيقونة التصنيف"
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ'}
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
