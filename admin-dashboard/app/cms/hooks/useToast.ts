'use client';
// ══════════════════════════════════════════════════════════════════════════════
// useToast — isolated toast notification state, zero coupling to CMS logic
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '../types';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success', duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
