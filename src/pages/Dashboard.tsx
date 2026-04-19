import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, Users, Truck, BarChart3, Bell, LogOut, RefreshCw, Plus,
  CheckCircle, XCircle, Clock, Search, X, AlertCircle, Sun, Moon,
  Download, Send, Store, Globe, Box, Send as SendIcon, CornerDownLeft,
  UserCog, Settings as SettingsIcon, Menu, History, Target, Languages,
  Phone, ShieldAlert, Coins, Warehouse, Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t as tr, type Language } from '../lib/i18n';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import OrderTimelineModal from '../components/OrderTimelineModal';
import Logo from '../components/Logo';
import TrialExpiredWall from '../components/TrialExpiredWall';
import {
  agentsApi, customersApi, dashboardApi, notificationsApi, ordersApi,
  type ApiAgent, type ApiCustomer, type ApiDashboardStats, type ApiNotification,
  type ApiOrder, type OrderStatus,
} from '../lib/api';
import { humanizeError } from '../lib/errorsI18n';
import {
  StoresTab, CarriersTab, ProductsTab, ShipmentsTab, ReturnsTab,
  TeamTab, SettingsTab, CallCenterTab, FraudTab, CommissionsTab,
  WarehousesTab, CodTab,
} from './tabs/OctomaticTabs';

type Tab =
  | 'overview' | 'orders' | 'customers' | 'agents'
  | 'stores' | 'carriers' | 'products' | 'shipments'
  | 'returns' | 'team' | 'settings'
  | 'callcenter' | 'fraud' | 'commissions' | 'warehouses' | 'cod';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  shipped: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function TrialBanner() {
  const { subscription } = useApp();
  if (!subscription) return null;
  if (subscription.plan !== 'trial') return null;
  const days = subscription.days_left;
  const urgent = days <= 3;
  return (
    <div
      className={`mb-6 p-4 rounded-2xl flex items-center gap-4 ${
        urgent
          ? 'bg-red-500/10 border border-red-500/30'
          : 'bg-amber-500/10 border border-amber-500/30'
      }`}
    >
      <Clock className={`w-6 h-6 ${urgent ? 'text-red-400' : 'text-amber-400'}`} />
      <div className="flex-1">
        <p className={`font-bold ${urgent ? 'text-red-300' : 'text-amber-200'}`}>
          {days > 0 ? `${days} day${days === 1 ? '' : 's'} left on your free trial` : 'Trial ends today'}
        </p>
        <p className="text-sm text-gray-400">Upgrade anytime to keep uninterrupted access.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function LangSwitch() {
  const { lang, setLang } = useApp();
  const [open, setOpen] = useState(false);
  const labels: Record<Language, string> = { en: 'EN', fr: 'FR', ar: 'AR' };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 p-2 rounded-xl text-gray-500 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={tr(lang, 'ui_language')}
        title={tr(lang, 'ui_language')}
      >
        <Languages className="w-5 h-5" />
        <span className="text-xs font-bold">{labels[lang]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-40 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
            {(['en', 'fr', 'ar'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm font-semibold ${
                  l === lang
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {labels[l]} — {l === 'en' ? 'English' : l === 'fr' ? 'Français' : 'العربية'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const { lang } = useApp();

  const refresh = useCallback(() => {
    setLoading(true);
    dashboardApi.stats()
      .then(setStats)
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !stats) {
    return <div className="flex items-center justify-center py-24 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }
  if (err) return <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-2xl text-red-300">{err}</div>;
  if (!stats) return null;

  const conversionPct = Math.round(((stats.rates?.conversion_rate ?? 0)) * 100);
  const cards = [
    { key: 'card_total_orders', value: stats.totals.orders, icon: Package, color: 'from-indigo-500 to-violet-500' },
    { key: 'card_delivered', value: stats.by_status.delivered, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { key: 'card_pending', value: stats.by_status.pending, icon: Clock, color: 'from-amber-500 to-orange-500' },
    { key: 'card_conversion', value: `${conversionPct}%`, icon: Target, color: 'from-cyan-500 to-sky-500' },
    { key: 'card_revenue', value: formatCurrency(stats.totals.revenue_delivered), icon: BarChart3, color: 'from-rose-500 to-pink-500' },
  ];

  const maxOrders = Math.max(1, ...stats.daily_30d.map(d => d.orders));

  return (
    <div className="space-y-6">
      <TrialBanner />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map(c => (
          <motion.div
            key={c.key}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{tr(lang, c.key)}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{c.value}</p>
            {c.key === 'card_conversion' && (
              <p className="text-[11px] text-gray-400 mt-0.5">{tr(lang, 'card_conversion_sub')}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Last 30 days · orders</h3>
        <div className="flex items-end gap-1 h-40">
          {stats.daily_30d.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group">
              <div
                className="w-full bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t transition-all"
                style={{ height: `${(d.orders / maxOrders) * 100}%`, minHeight: d.orders > 0 ? 3 : 1 }}
                title={`${d.date}: ${d.orders} orders, ${d.delivered} delivered`}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Hover bars for daily totals.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Top delivery agents</h3>
        {stats.top_agents.length === 0 ? (
          <p className="text-sm text-gray-400">No delivery agents yet. Add one from the Agents tab.</p>
        ) : (
          <ul className="space-y-2">
            {stats.top_agents.map(a => (
              <li key={a.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{a.name}</p>
                  <p className="text-xs text-gray-500">{a.zone || 'no zone'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-500">{a.delivered} delivered</p>
                  <p className="text-xs text-gray-500">of {a.total}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders tab
// ---------------------------------------------------------------------------

function OrdersTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [agents, setAgents] = useState<ApiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'' | OrderStatus>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showNew, setShowNew] = useState(false);
  const [timelineOrder, setTimelineOrder] = useState<ApiOrder | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      ordersApi.list({ status: filter || undefined, q: search || undefined }),
      customersApi.list(),
      agentsApi.list(),
    ])
      .then(([o, c, a]) => { setOrders(o); setCustomers(c); setAgents(a); })
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [filter, search, lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const advanceStatus = async (o: ApiOrder) => {
    const next: OrderStatus | null =
      o.status === 'pending' ? 'confirmed'
      : o.status === 'confirmed' ? 'shipped'
      : o.status === 'shipped' ? 'delivered'
      : null;
    if (!next) return;
    try {
      await ordersApi.status(o.id, next);
      toast.success('Order advanced', `${o.reference} → ${STATUS_LABEL[next].toLowerCase()}`);
      refresh();
    } catch (e) {
      toast.error('Could not advance order', humanizeError(e, lang));
    }
  };

  const bulk = async (action: 'confirm' | 'cancel') => {
    if (selected.size === 0) return;
    const count = selected.size;
    const ok = await confirmAction({
      title: action === 'confirm'
        ? `Confirm ${count} order${count === 1 ? '' : 's'}?`
        : `Cancel ${count} order${count === 1 ? '' : 's'}?`,
      description: action === 'confirm'
        ? 'Selected orders will move to Confirmed and customers will be notified.'
        : 'Selected orders will be marked as Cancelled. This cannot be undone.',
      confirmLabel: action === 'confirm' ? 'Confirm all' : 'Cancel all',
      danger: action === 'cancel',
    });
    if (!ok) return;
    try {
      const fn = action === 'confirm' ? ordersApi.bulkConfirm : ordersApi.bulkCancel;
      await fn(Array.from(selected));
      toast.success(
        action === 'confirm' ? `${count} order${count === 1 ? '' : 's'} confirmed` : `${count} order${count === 1 ? '' : 's'} cancelled`,
      );
      setSelected(new Set());
      refresh();
    } catch (e) {
      toast.error('Bulk action failed', humanizeError(e, lang));
    }
  };

  const allVisibleSelected = orders.length > 0 && orders.every(o => selected.has(o.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as OrderStatus | '')}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{selected.size} selected</span>
            <button onClick={() => bulk('confirm')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Confirm
            </button>
            <button onClick={() => bulk('cancel')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={() => setSelected(new Set())} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg" aria-label="Clear selection">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await ordersApi.downloadCsv();
            } catch (e) {
              toast.error('CSV export failed', humanizeError(e, lang));
            }
          }}
          className="px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-xl inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New order
        </button>
      </div>

      {err && <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-sm text-red-300">{err}</div>}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all orders"
                  />
                </th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No orders yet. Create one to get started.</td></tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">{o.reference}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{o.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{o.product_name} × {o.quantity}</td>
                    <td className="px-4 py-3 text-gray-500">{o.agent?.name || <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{formatCurrency(o.price)} {o.currency}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_COLOR[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setTimelineOrder(o)}
                          className="p-1.5 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                          title="View timeline"
                          aria-label="View timeline"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {o.status !== 'delivered' && o.status !== 'cancelled' && (
                          <button
                            onClick={() => advanceStatus(o)}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Advance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <NewOrderModal customers={customers} agents={agents} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refresh(); }} />}
      {timelineOrder && <OrderTimelineModal order={timelineOrder} onClose={() => setTimelineOrder(null)} />}
    </div>
  );
}

function NewOrderModal({
  customers, agents, onClose, onCreated,
}: {
  customers: ApiCustomer[]; agents: ApiAgent[]; onClose: () => void; onCreated: () => void;
}) {
  const { lang } = useApp();
  const [form, setForm] = useState({
    product_name: '',
    quantity: 1,
    price: 0,
    customer_id: '' as string | '',
    agent_id: '' as string | '',
    shipping_address: '',
    shipping_city: '',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await ordersApi.create({
        product_name: form.product_name.trim(),
        quantity: Number(form.quantity) || 1,
        price: Number(form.price) || 0,
        currency: 'DZD',
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        agent_id: form.agent_id ? Number(form.agent_id) : null,
        shipping_address: form.shipping_address.trim(),
        shipping_city: form.shipping_city.trim(),
      });
      onCreated();
    } catch (e) {
      setErr(humanizeError(e, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">New order</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-200"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input required value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="Product name" className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} placeholder="Quantity" className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            <input type="number" min={0} step="0.01" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} placeholder="Price (DZD)" className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500">
            <option value="">No customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
          </select>
          <select value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })} className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500">
            <option value="">No agent</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name} · {a.zone}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.shipping_city} onChange={e => setForm({ ...form, shipping_city: e.target.value })} placeholder="City" className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            <input value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} placeholder="Address" className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-60">
            {loading ? 'Creating…' : 'Create order'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customers tab
// ---------------------------------------------------------------------------

function CustomersTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', address: '' });

  const refresh = useCallback(() => {
    setLoading(true);
    customersApi.list(search)
      .then(setItems)
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [search, lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await customersApi.create(form);
      setForm({ name: '', phone: '', email: '', city: '', address: '' });
      setShowNew(false);
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete this customer?',
      description: 'Linked orders stay, but the customer profile will be removed.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await customersApi.remove(id);
      toast.success('Customer removed');
      refresh();
    } catch (e) {
      toast.error('Delete failed', humanizeError(e, lang));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <button onClick={() => setShowNew(v => !v)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New customer
        </button>
      </div>

      {showNew && (
        <form onSubmit={create} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <input required placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Add</button>
        </form>
      )}

      {err && <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-sm text-red-300">{err}</div>}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No customers yet.</td></tr>
            ) : items.map(c => (
              <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                <td className="px-4 py-3 text-gray-500">{c.city}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agents tab
// ---------------------------------------------------------------------------

function AgentsTab() {
  const { lang } = useApp();
  const toast = useToast();
  const [items, setItems] = useState<ApiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', zone: '' });

  const refresh = useCallback(() => {
    setLoading(true);
    agentsApi.list()
      .then(setItems)
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await agentsApi.create({ ...form, active: true });
      setForm({ name: '', phone: '', zone: '' });
      setShowNew(false);
      refresh();
    } catch (e) { setErr(humanizeError(e, lang)); }
  };

  const toggle = async (a: ApiAgent) => {
    try {
      // Backend PUT /agents/{id} requires the full AgentIn payload (name is
      // mandatory, min_length=1), not a partial patch — sending just { active }
      // returns 422. Re-send the agent's existing fields alongside the toggle.
      await agentsApi.update(a.id, {
        name: a.name,
        phone: a.phone,
        zone: a.zone,
        active: !a.active,
      });
      toast.success(a.active ? 'Agent deactivated' : 'Agent activated');
      refresh();
    } catch (e) {
      toast.error('Update failed', humanizeError(e, lang));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Delivery agents</h3>
        <button onClick={() => setShowNew(v => !v)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New agent
        </button>
      </div>

      {showNew && (
        <form onSubmit={create} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <input placeholder="Zone (e.g. Algiers)" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white" />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Add</button>
        </form>
      )}

      {err && <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-sm text-red-300">{err}</div>}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Zone</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Open</th>
              <th className="px-4 py-3 text-left">Delivered</th>
              <th className="px-4 py-3 text-left">Failed</th>
              <th className="px-4 py-3 text-left">On-time</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No delivery agents yet.</td></tr>
            ) : items.map(a => (
              <tr key={a.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{a.name}</td>
                <td className="px-4 py-3 text-gray-500">{a.zone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{a.phone}</td>
                <td className="px-4 py-3 text-gray-500">{a.assigned_open}</td>
                <td className="px-4 py-3 text-green-500 font-bold">{a.delivered_count}</td>
                <td className="px-4 py-3 text-red-400 font-bold">{a.failed_count}</td>
                <td className="px-4 py-3 text-gray-500">{a.on_time_rate.toFixed(0)}%</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggle(a)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${a.active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}
                  >
                    {a.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications dropdown
// ---------------------------------------------------------------------------

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    notificationsApi.list()
      .then(({ items, unread }) => { setItems(items); setUnread(unread); })
      .catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    try {
      await notificationsApi.markRead([], true);
      load();
    } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-gray-500 hover:text-indigo-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-40">
          <div className="p-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-indigo-500 hover:text-indigo-400">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">No notifications yet.</p>
            ) : items.slice(0, 20).map(n => (
              <div key={n.id} className={`p-3 border-b border-gray-50 dark:border-gray-800/50 ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user, tenant, subscription, signOut, theme, setTheme, platformSettings, lang } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const platformName = platformSettings?.platform_name || 'auto Flow';
  const [brandFirst, ...brandRest] = platformName.split(' ');
  const brandSecond = brandRest.join(' ');

  const tabs: Array<{ key: Tab; i18nKey: string; icon: React.ComponentType<{ className?: string }> }> = useMemo(() => [
    { key: 'overview', i18nKey: 'tab_overview', icon: BarChart3 },
    { key: 'orders', i18nKey: 'tab_orders', icon: Package },
    { key: 'callcenter', i18nKey: 'tab_callcenter', icon: Phone },
    { key: 'customers', i18nKey: 'tab_customers', icon: Users },
    { key: 'agents', i18nKey: 'tab_agents', icon: Truck },
    { key: 'stores', i18nKey: 'tab_stores', icon: Store },
    { key: 'carriers', i18nKey: 'tab_carriers', icon: Globe },
    { key: 'products', i18nKey: 'tab_products', icon: Box },
    { key: 'warehouses', i18nKey: 'tab_warehouses', icon: Warehouse },
    { key: 'shipments', i18nKey: 'tab_shipments', icon: SendIcon },
    { key: 'returns', i18nKey: 'tab_returns', icon: CornerDownLeft },
    { key: 'cod', i18nKey: 'tab_cod', icon: Wallet },
    { key: 'commissions', i18nKey: 'tab_commissions', icon: Coins },
    { key: 'fraud', i18nKey: 'tab_fraud', icon: ShieldAlert },
    { key: 'team', i18nKey: 'tab_team', icon: UserCog },
    { key: 'settings', i18nKey: 'tab_settings', icon: SettingsIcon },
  ], []);

  const logout = () => { signOut(); navigate('/'); };
  const go = (k: Tab) => { setTab(k); setMobileNavOpen(false); };

  // Trust the backend's authoritative `active` flag: paid plans that
  // expire keep their `plan` value (e.g. "professional") but flip
  // `active` to false, so a plan-string check alone misses them.
  const trialExpired = subscription != null && !subscription.active;
  const activeLabel = tr(lang, tabs.find(t => t.key === tab)?.i18nKey ?? 'tab_overview');
  const userInitial = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();

  const Sidebar = (
    <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 h-full">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Package className="w-4 h-4 text-white" />
        </div>
        <span className="font-black text-gray-900 dark:text-white text-sm">
          <span>{brandFirst}</span>{brandSecond && <> <span className="text-indigo-500">{brandSecond}</span></>}
        </span>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden ml-auto p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {subscription?.plan === 'trial' && subscription.days_left > 0 && (
        <div className="mx-3 mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40">
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{tr(lang, 'trial_title')}</div>
          <div className="text-[11px] text-indigo-500 mt-0.5">{subscription.days_left} {tr(lang, 'trial_days_left')}</div>
        </div>
      )}

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <t.icon className="w-5 h-5 flex-shrink-0" />
            {tr(lang, t.i18nKey)}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || user?.email}</div>
            <div className="text-xs text-gray-500 truncate">{tenant?.name}</div>
          </div>
          <button
            onClick={logout}
            title={tr(lang, 'ui_sign_out')}
            aria-label={tr(lang, 'ui_sign_out')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{Sidebar}</div>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-50 h-full">{Sidebar}</div>
        </div>
      )}

      {/* Main pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 sm:px-5 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex-1 truncate">{activeLabel}</h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationsBell />
            <LangSwitch />
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-gray-500 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block text-right ml-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500 leading-tight">{tenant?.name}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="max-w-7xl mx-auto">
            {tab === 'overview' && <Overview />}
            {tab === 'orders' && <OrdersTab />}
            {tab === 'customers' && <CustomersTab />}
            {tab === 'agents' && <AgentsTab />}
            {tab === 'stores' && <StoresTab />}
            {tab === 'carriers' && <CarriersTab />}
            {tab === 'products' && <ProductsTab />}
            {tab === 'shipments' && <ShipmentsTab />}
            {tab === 'returns' && <ReturnsTab />}
            {tab === 'callcenter' && <CallCenterTab />}
            {tab === 'warehouses' && <WarehousesTab />}
            {tab === 'cod' && <CodTab />}
            {tab === 'commissions' && <CommissionsTab />}
            {tab === 'fraud' && <FraudTab />}
            {tab === 'team' && <TeamTab />}
            {tab === 'settings' && <SettingsTab />}
          </div>
        </main>
      </div>

      {trialExpired && <TrialExpiredWall />}
    </div>
  );
}

// mark imports as used to satisfy tsc without changing behavior
void AlertCircle; void XCircle;
