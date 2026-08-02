'use client';

import * as React from 'react';

type Toast = {
  id: number;
  message: string;
  tone: 'success' | 'error';
};

type ToastContextValue = {
  pushToast: (message: string, tone?: Toast['tone']) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const pushToast = React.useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(90vw,24rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${toast.tone === 'success' ? 'bg-brand-600 text-white' : 'bg-rose-600 text-white'}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
