'use client';
// ══════════════════════════════════════════════════════════════════════════════
// Toast — minimal in-app notification system
// ══════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info' }

const ToastContext = createContext<(message: string, type?: ToastItem['type']) => void>(() => {});

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const color = (type: ToastItem['type']) =>
    type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: color(t.type), color: '#fff',
            borderRadius: 12, padding: '10px 18px',
            fontFamily: 'Cairo', fontSize: 14, fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.25s ease',
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </ToastContext.Provider>
  );
}
