'use client';
// ══════════════════════════════════════════════════════════════════════════════
// ImageUploader — drag/drop + browse file picker with inline preview
// ══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useCallback } from 'react';
import type { UploadProgress } from '../types';

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  progress?: UploadProgress;
  onFileSelected: (file: File) => void;
  onRemove?: () => void;
  label?: string;
}

export function ImageUploader({
  currentImageUrl,
  progress,
  onFileSelected,
  onRemove,
  label = 'صورة البانر',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
    onFileSelected(file);
  }, [onFileSelected]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  const displayUrl = previewUrl || currentImageUrl;
  const isUploading = progress?.status === 'uploading';

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: 'Cairo', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
        {label}
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 14, padding: 18,
          textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(212,164,55,0.06)' : 'var(--surface)',
          transition: 'all 0.2s',
          minHeight: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="preview"
            style={{ maxHeight: 120, borderRadius: 10, objectFit: 'cover', maxWidth: '100%' }}
          />
        ) : (
          <>
            <span style={{ fontSize: 32 }}>🖼️</span>
            <span style={{ fontFamily: 'Cairo', fontSize: 13, color: 'var(--text-muted)' }}>
              اسحب صورة هنا أو انقر للاختيار
            </span>
            <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--text-muted)' }}>
              JPG • PNG • WEBP • حتى 5MB
            </span>
          </>
        )}
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress?.progress ?? 0}%`,
                background: 'linear-gradient(90deg, var(--gold), var(--orange))',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{ fontFamily: 'Cairo', fontSize: 12, color: 'var(--text-muted)' }}>
            جاري الرفع... {progress?.progress ?? 0}%
          </span>
        </div>
      )}

      {/* Action buttons row */}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer',
          }}
        >
          {displayUrl ? '🔄 تغيير' : '📁 اختيار'}
        </button>

        {displayUrl && onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); onRemove(); }}
            style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1.5px solid #ff4444', background: 'transparent',
              color: '#ff4444', fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer',
            }}
          >
            🗑️ حذف
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
