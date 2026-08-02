'use client';

import { useEffect, useState } from 'react';

export type ToastMessage = {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
};

const createId = () => Math.random().toString(36).slice(2, 10);

export function ToastProvider() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = window.setTimeout(() => {
      setMessages((current) => current.slice(1));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [messages]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    setMessages((current) => [{ id: createId(), ...toast }, ...current]);
  };

  (window as any).__retarGO_toast = addToast;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-3">
      {messages.map((message) => (
        <div key={message.id} className={`rounded-2xl border px-4 py-3 shadow-lg transition ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : message.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-slate-200 bg-slate-50 text-slate-900'
        }`}>
          <p className="font-semibold">{message.title}</p>
          {message.description ? <p className="mt-1 text-sm opacity-90">{message.description}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function toast(message: Omit<ToastMessage, 'id'>) {
  const fn = (window as any).__retarGO_toast;
  if (typeof fn === 'function') fn(message);
}
