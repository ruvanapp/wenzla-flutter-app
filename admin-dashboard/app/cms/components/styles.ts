'use client';
// ── Shared style constants (not exported — internal to CMS components) ─────────

export const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5,
  fontFamily: 'Cairo', fontSize: 13, fontWeight: 600, color: 'var(--text)',
};

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text)', fontFamily: 'Cairo', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};

export const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, var(--gold), var(--orange))', color: '#fff',
  fontFamily: 'Cairo', fontSize: 14, fontWeight: 700,
};

export const secondaryBtn: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 12,
  border: '1.5px solid var(--border)', cursor: 'pointer',
  background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'Cairo', fontSize: 14,
};

export const iconBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 8,
  padding: '4px 8px', cursor: 'pointer', fontSize: 13, color: 'var(--text)',
  fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
};
