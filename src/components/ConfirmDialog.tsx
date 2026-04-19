/**
 * Accessible confirm dialog — replaces window.confirm() with a stylised modal
 * that integrates with the app's dark mode and Tailwind design tokens.
 *
 * Usage:
 *   const confirmAction = useConfirm();
 *   const ok = await confirmAction({
 *     title: 'Delete this customer?',
 *     description: 'This action cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *   });
 *   if (!ok) return;
 */
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    setOpts({
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      ...options,
    });
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
  }, []);

  const resolve = (value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  // Close on Escape. We intentionally do NOT bind Enter at the window level —
  // the autoFocus Confirm button already handles Enter natively, and binding
  // it globally would hijack Enter when focus is on the Cancel button and
  // silently confirm destructive actions.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => resolve(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-md p-5 sm:p-6">
            <div className="flex items-start gap-3">
              {opts.danger && (
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">{opts.title}</h3>
                {opts.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opts.description}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => resolve(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {opts.cancelLabel}
              </button>
              <button
                onClick={() => resolve(true)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${
                  opts.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                autoFocus
              >
                {opts.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
