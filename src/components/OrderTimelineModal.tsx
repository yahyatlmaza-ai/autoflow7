/**
 * Order status timeline modal — shows the history of transitions for an order.
 *
 * Backed by GET /orders/{id}/history which returns
 *   [{ id, from_status, to_status, note, created_at }, ...].
 */
import { useEffect, useState } from 'react';
import { X, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { ordersApi, type ApiOrder } from '../lib/api';
import { useApp } from '../context/AppContext';
import { humanizeError } from '../lib/errorsI18n';

type HistoryRow = {
  id: number;
  from_status: string | null;
  to_status: string;
  note: string;
  created_at: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-500 text-white',
  confirmed: 'bg-blue-500 text-white',
  shipped: 'bg-violet-500 text-white',
  delivered: 'bg-emerald-500 text-white',
  cancelled: 'bg-red-500 text-white',
};

function fmt(ts: string | null): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function OrderTimelineModal({
  order, onClose,
}: {
  order: ApiOrder;
  onClose: () => void;
}) {
  const { lang } = useApp();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ordersApi.history(order.id)
      .then(r => { if (!cancelled) setRows(r); })
      .catch(e => { if (!cancelled) setErr(humanizeError(e, lang)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [order.id, lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Order timeline</p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white truncate">{order.reference}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{order.product_name} × {order.quantity}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading history…
            </div>
          ) : err ? (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {err}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">No transitions yet.</p>
          ) : (
            <ol className="relative pl-6 space-y-5">
              <span className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-400 via-violet-400 to-emerald-400 dark:from-indigo-700 dark:via-violet-700 dark:to-emerald-700" />
              {rows.map(r => (
                <li key={r.id} className="relative">
                  <span className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-900 border-2 border-indigo-500" />
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {r.from_status && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLOR[r.from_status] || 'bg-gray-500 text-white'}`}>
                        {r.from_status}
                      </span>
                    )}
                    {r.from_status && <span className="text-gray-400">→</span>}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLOR[r.to_status] || 'bg-gray-500 text-white'}`}>
                      {r.to_status}
                    </span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {fmt(r.created_at)}
                    </span>
                  </div>
                  {r.note && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                      {r.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
