/**
 * Minimal toast system — ToastProvider + useToast hook.
 *
 * Wraps the app once at the root and exposes `toast.success() / .error() /
 * .info()` to every component.  Replaces window.alert() for user-facing
 * errors and confirmations so we get non-blocking, dismissible UI.
 */
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastApi {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
  dismiss: (id: number) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = nextId.current++;
    setItems(prev => [...prev, { id, kind, title, body }]);
    // Auto-dismiss after 4.5s
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const api: ToastApi = {
    success: (t, b) => push('success', t, b),
    error: (t, b) => push('error', t, b),
    info: (t, b) => push('info', t, b),
    dismiss,
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,380px)]">
        {items.map(t => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  const palette = {
    success: {
      icon: CheckCircle,
      ring: 'border-emerald-200 dark:border-emerald-900/50',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-500',
      title: 'text-emerald-800 dark:text-emerald-200',
    },
    error: {
      icon: AlertCircle,
      ring: 'border-red-200 dark:border-red-900/50',
      bg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-500',
      title: 'text-red-800 dark:text-red-200',
    },
    info: {
      icon: Info,
      ring: 'border-indigo-200 dark:border-indigo-900/50',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      iconColor: 'text-indigo-500',
      title: 'text-indigo-800 dark:text-indigo-200',
    },
  }[item.kind];

  const Icon = palette.icon;
  return (
    <div
      className={`pointer-events-auto ${palette.bg} border ${palette.ring} rounded-2xl shadow-lg p-3 flex items-start gap-3 transition-all duration-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      role="status"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${palette.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${palette.title}`}>{item.title}</p>
        {item.body && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.body}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
