'use client';
// ══════════════════════════════════════════════════════════════════════════════
// MobilePreview — isolated live preview of CMS data inside a phone frame
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { Banner, Category } from '../types';

interface MobilePreviewProps {
  banners: Banner[];
  categories: Category[];
}

export function MobilePreview({ banners, categories }: MobilePreviewProps) {
  const activeBanners = banners.filter(b => b.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeCategories = categories.filter(c => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div style={{
      width: 220, flexShrink: 0, position: 'sticky', top: 20,
      border: '8px solid #1a1a2e', borderRadius: 36, background: '#0f0f1a',
      overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      height: 'fit-content', maxHeight: '80vh', overflowY: 'auto',
    }}>
      {/* Status bar */}
      <div style={{ background: '#1a1a2e', height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 60, height: 5, background: '#333', borderRadius: 4 }} />
      </div>

      {/* App content */}
      <div style={{ background: '#FFF9F0', minHeight: 480, overflowY: 'auto' }}>
        {/* App header */}
        <div style={{ background: 'linear-gradient(135deg, #2D1B00, #8B4513)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <span style={{ fontFamily: 'Cairo', fontWeight: 900, fontSize: 13, color: '#D4A437' }}>سوق العسل</span>
          <span style={{ fontSize: 16 }}>🔍</span>
        </div>

        {/* Hero banner */}
        {activeBanners.length > 0 ? (
          <div style={{ margin: '8px 8px', borderRadius: 12, overflow: 'hidden', height: 90, position: 'relative' }}>
            {activeBanners[0].imageUrl ? (
              <img src={activeBanners[0].imageUrl} alt={activeBanners[0].title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${activeBanners[0].color1 ?? '#2D1B00'}, ${activeBanners[0].color2 ?? '#8B4513'})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontFamily: 'Cairo', fontWeight: 900, fontSize: 11, color: '#D4A437', textAlign: 'center', padding: '0 8px' }}>{activeBanners[0].title}</span>
                {activeBanners[0].subtitle && <span style={{ fontFamily: 'Cairo', fontSize: 9, color: '#fff', textAlign: 'center', padding: '0 8px' }}>{activeBanners[0].subtitle}</span>}
              </div>
            )}
          </div>
        ) : (
          <div style={{ margin: '8px', height: 80, borderRadius: 12, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Cairo', fontSize: 10, color: '#9ca3af' }}>لا توجد بنرات</span>
          </div>
        )}

        {/* Dots */}
        {activeBanners.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4 }}>
            {activeBanners.slice(0, 5).map((_, i) => (
              <div key={i} style={{ width: i === 0 ? 14 : 6, height: 6, borderRadius: 3, background: i === 0 ? '#D4A437' : '#d1d5db' }} />
            ))}
          </div>
        )}

        {/* Categories */}
        <div style={{ padding: '10px 10px 4px' }}>
          <span style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 11, color: '#2D1B00' }}>التصنيفات</span>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '4px 10px 10px', overflowX: 'auto' }}>
          {activeCategories.length > 0 ? activeCategories.slice(0, 6).map(cat => (
            <div key={cat.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: cat.colorHex ?? '#D4A437', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.name} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 6 }} /> : (cat.iconEmoji || '🏷️')}
              </div>
              <span style={{ fontFamily: 'Cairo', fontSize: 8, color: '#374151', textAlign: 'center', maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
            </div>
          )) : (
            <span style={{ fontFamily: 'Cairo', fontSize: 10, color: '#9ca3af' }}>لا توجد تصنيفات</span>
          )}
        </div>

        {/* Featured stores placeholder */}
        <div style={{ padding: '8px 10px 4px' }}>
          <span style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 11, color: '#2D1B00' }}>متاجر مميزة</span>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '4px 10px 10px', overflowX: 'auto' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: 60, flexShrink: 0, background: '#fff', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: '1px solid #e5e7eb' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e5e7eb' }} />
              <div style={{ width: 40, height: 6, background: '#e5e7eb', borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ background: '#1a1a2e', height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 4, background: '#444', borderRadius: 2 }} />
      </div>
    </div>
  );
}
