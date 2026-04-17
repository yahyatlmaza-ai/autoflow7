/**
 * Octomatic-style extension tabs for the Dashboard.
 *
 * Each tab is a self-contained CRUD surface for one of:
 *   stores · carriers (+ rates) · products · shipments · returns · team · settings · webhooks
 *
 * Visual vocabulary matches the existing Dashboard (rounded-2xl cards, indigo
 * primaries, amber/blue/violet/green/red status pills).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, RefreshCw, Trash2, Send, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  carriersApi, productsApi, returnsApi, settingsApi, shipmentsApi,
  storesApi, teamApi, webhooksApi, ordersApi,
  type ApiCarrier, type ApiDeliveryRate, type ApiOrder, type ApiProduct,
  type ApiReturn, type ApiShipment, type ApiStore, type ApiTeamMember,
  type ApiTenantSettings, type ApiWebhook,
} from '../../lib/api';
import { humanizeError } from '../../lib/errorsI18n';

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Section({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      ok
        ? 'bg-green-500/15 text-green-500 border-green-500/30'
        : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
    }`}>
      {children}
    </span>
  );
}

function Spin() {
  return (
    <div className="flex items-center justify-center py-10 text-gray-400">
      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{children}</p>;
}

function ErrorBox({ err }: { err: string }) {
  if (!err) return null;
  return (
    <div className="p-3 mb-3 bg-red-900/20 border border-red-700/40 rounded-xl text-sm text-red-300 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" /> {err}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500';

const primaryBtn =
  'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2 disabled:opacity-50';

const dangerBtn =
  'p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors';

// ---------------------------------------------------------------------------
// STORES
// ---------------------------------------------------------------------------

export function StoresTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiStore[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', platform: 'custom', url: '', api_key: '', api_secret: '' });

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([storesApi.list(), storesApi.platforms()])
      .then(([list, p]) => { setItems(list); setPlatforms(p.platforms); })
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await storesApi.create(form);
      setForm({ name: '', platform: 'custom', url: '', api_key: '', api_secret: '' });
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const sync = async (id: number) => {
    try {
      await storesApi.sync(id);
      toast.success('Store synced', 'Fresh orders imported from the platform.');
      refresh();
    } catch (e) {
      toast.error('Sync failed', humanizeError(e, lang));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete this store?',
      description: 'Connected orders will be kept but no new orders will be imported.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await storesApi.remove(id);
      toast.success('Store removed');
      refresh();
    } catch (e) {
      toast.error('Delete failed', humanizeError(e, lang));
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Connected stores"
        subtitle="Link Shopify, WooCommerce, Magento, OpenCart or any custom store to auto-import orders."
      >
        <ErrorBox err={err} />
        {loading ? <Spin /> : items.length === 0 ? (
          <Empty>No stores connected yet. Add your first one below.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                <tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Platform</th>
                <th className="px-3 py-2 text-left">URL</th><th className="px-3 py-2 text-left">API key</th>
                <th className="px-3 py-2 text-left">Imported</th><th className="px-3 py-2 text-left">Last sync</th>
                <th className="px-3 py-2 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{s.name}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{s.platform}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[180px]">{s.url || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.api_key_preview || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{s.orders_imported}</td>
                    <td className="px-3 py-2 text-gray-500">{s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : 'Never'}</td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button onClick={() => sync(s.id)} className="px-2 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center gap-1"><Send className="w-3 h-3" /> Sync</button>
                      <button onClick={() => remove(s.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Add a store" subtitle="Paste the platform API credentials — they are stored encrypted and never shown again.">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Store name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <select className={inputCls} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className={inputCls + ' md:col-span-2'} placeholder="Store URL (https://mystore.myshopify.com)" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          <input className={inputCls} placeholder="API key" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} />
          <input className={inputCls} placeholder="API secret" type="password" value={form.api_secret} onChange={e => setForm({ ...form, api_secret: e.target.value })} />
          <button className={primaryBtn + ' md:col-span-2 justify-center'}><Plus className="w-4 h-4" /> Connect store</button>
        </form>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CARRIERS (+ delivery rates)
// ---------------------------------------------------------------------------

export function CarriersTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiCarrier[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [wilayas, setWilayas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', provider: 'yalidine', api_id: '', api_token: '' });
  const [selectedCarrier, setSelectedCarrier] = useState<number | null>(null);
  const [rates, setRates] = useState<ApiDeliveryRate[]>([]);
  const [rateForm, setRateForm] = useState({ wilaya: '', home_price: 0, desk_price: 0 });

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([carriersApi.list(), carriersApi.providers()])
      .then(([list, p]) => { setItems(list); setProviders(p.providers); setWilayas(p.wilayas); })
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (selectedCarrier == null) { setRates([]); return; }
    carriersApi.rates(selectedCarrier).then(setRates).catch(() => setRates([]));
  }, [selectedCarrier]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await carriersApi.create(form);
      setForm({ name: '', provider: 'yalidine', api_id: '', api_token: '' });
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete this carrier?',
      description: 'All of its delivery rates will be deleted too. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await carriersApi.remove(id);
      if (selectedCarrier === id) setSelectedCarrier(null);
      toast.success('Carrier removed');
      refresh();
    } catch (e) {
      toast.error('Delete failed', humanizeError(e, lang));
    }
  };

  const addRate = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedCarrier == null) return;
    try {
      await carriersApi.createRate(selectedCarrier, {
        wilaya: rateForm.wilaya,
        home_price: Number(rateForm.home_price),
        desk_price: Number(rateForm.desk_price),
      });
      setRateForm({ wilaya: '', home_price: 0, desk_price: 0 });
      carriersApi.rates(selectedCarrier).then(setRates);
      toast.success('Rate added');
    } catch (e) {
      toast.error('Could not add rate', humanizeError(e, lang));
    }
  };

  const removeRate = async (id: number) => {
    await carriersApi.removeRate(id);
    if (selectedCarrier) carriersApi.rates(selectedCarrier).then(setRates);
  };

  return (
    <div className="space-y-6">
      <Section title="Delivery carriers" subtitle="Yalidine, ZR Express, Noest, Amana, EMS, DHL, FedEx, UPS, Aramex — or any custom carrier.">
        <ErrorBox err={err} />
        {loading ? <Spin /> : items.length === 0 ? (
          <Empty>No carriers yet. Add one below.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(c => (
              <div key={c.id} className={`p-3 rounded-xl border cursor-pointer ${
                selectedCarrier === c.id
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`} onClick={() => setSelectedCarrier(selectedCarrier === c.id ? null : (c.id ?? null))}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{c.provider.replace(/_/g, ' ')}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); remove(c.id); }} className={dangerBtn}><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Pill ok={c.active}>{c.active ? 'Active' : 'Inactive'}</Pill>
                  <Pill ok={c.supports_home}>Home</Pill>
                  <Pill ok={c.supports_desk}>Desk</Pill>
                  <Pill ok={c.supports_cod}>COD</Pill>
                  <Pill ok={c.api_token_set}>API {c.api_token_set ? 'set' : 'missing'}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Add a carrier">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Name (e.g. Yalidine Alger)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <select className={inputCls} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
            {providers.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
          <input className={inputCls} placeholder="API ID" value={form.api_id} onChange={e => setForm({ ...form, api_id: e.target.value })} />
          <input className={inputCls} placeholder="API token" type="password" value={form.api_token} onChange={e => setForm({ ...form, api_token: e.target.value })} />
          <button className={primaryBtn + ' md:col-span-2 justify-center'}><Plus className="w-4 h-4" /> Add carrier</button>
        </form>
      </Section>

      {selectedCarrier != null && (
        <Section title="Delivery rates (per wilaya)" subtitle="Home and desk prices per Algerian wilaya for the selected carrier.">
          <form onSubmit={addRate} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <select className={inputCls} value={rateForm.wilaya} onChange={e => setRateForm({ ...rateForm, wilaya: e.target.value })} required>
              <option value="">Select wilaya…</option>
              {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <input className={inputCls} type="number" min={0} placeholder="Home price" value={rateForm.home_price} onChange={e => setRateForm({ ...rateForm, home_price: Number(e.target.value) })} />
            <input className={inputCls} type="number" min={0} placeholder="Desk price" value={rateForm.desk_price} onChange={e => setRateForm({ ...rateForm, desk_price: Number(e.target.value) })} />
            <button className={primaryBtn + ' justify-center'}><Plus className="w-4 h-4" /> Add</button>
          </form>
          {rates.length === 0 ? <Empty>No rates defined for this carrier.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs font-bold uppercase text-gray-500"><tr>
                  <th className="px-3 py-2 text-left">Wilaya</th>
                  <th className="px-3 py-2 text-left">Home</th>
                  <th className="px-3 py-2 text-left">Desk</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr></thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{r.wilaya}</td>
                      <td className="px-3 py-2 text-gray-500">{r.home_price} DZD</td>
                      <td className="px-3 py-2 text-gray-500">{r.desk_price} DZD</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => removeRate(r.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------

export function ProductsTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ sku: '', name: '', price: 0, cost: 0, stock: 0, description: '' });

  const refresh = useCallback(() => {
    setLoading(true);
    productsApi.list(q).then(setItems).catch(e => setErr(humanizeError(e, lang))).finally(() => setLoading(false));
  }, [q, lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await productsApi.create({
        sku: form.sku, name: form.name, price: Number(form.price),
        cost: Number(form.cost), stock: Number(form.stock), description: form.description,
      });
      setForm({ sku: '', name: '', price: 0, cost: 0, stock: 0, description: '' });
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete this product?',
      description: 'It will no longer appear in orders or the catalog.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await productsApi.remove(id);
      toast.success('Product removed');
      refresh();
    } catch (e) {
      toast.error('Delete failed', humanizeError(e, lang));
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Products catalog" action={
        <input className={inputCls + ' max-w-xs'} placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      }>
        <ErrorBox err={err} />
        {loading ? <Spin /> : items.length === 0 ? <Empty>No products yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-bold uppercase text-gray-500"><tr>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Price</th>
                <th className="px-3 py-2 text-left">Cost</th>
                <th className="px-3 py-2 text-left">Margin</th>
                <th className="px-3 py-2 text-left">Stock</th>
                <th className="px-3 py-2 text-right"></th>
              </tr></thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.sku || '—'}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{p.price.toLocaleString()} DZD</td>
                    <td className="px-3 py-2 text-gray-500">{p.cost.toLocaleString()} DZD</td>
                    <td className="px-3 py-2 text-green-500 font-bold">{Math.round(p.price - p.cost).toLocaleString()} DZD</td>
                    <td className={`px-3 py-2 font-bold ${p.stock > 10 ? 'text-green-500' : p.stock > 0 ? 'text-amber-500' : 'text-red-500'}`}>{p.stock}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => remove(p.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Add a product">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className={inputCls} placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
          <input className={inputCls + ' md:col-span-2'} placeholder="Product name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className={inputCls} type="number" min={0} placeholder="Price (DZD)" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          <input className={inputCls} type="number" min={0} placeholder="Cost (DZD)" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
          <input className={inputCls} type="number" min={0} placeholder="Stock quantity" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
          <textarea className={inputCls + ' md:col-span-3'} placeholder="Description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <button className={primaryBtn + ' md:col-span-3 justify-center'}><Plus className="w-4 h-4" /> Add product</button>
        </form>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHIPMENTS
// ---------------------------------------------------------------------------

const SHIP_COLOR: Record<ApiShipment['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  printed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  in_transit: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function ShipmentsTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiShipment[]>([]);
  const [carriers, setCarriers] = useState<ApiCarrier[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ order_id: '', carrier_id: '', delivery_type: 'home' as 'home' | 'desk', cost: 0 });

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([shipmentsApi.list(), carriersApi.list(), ordersApi.list()])
      .then(([s, c, o]) => { setItems(s); setCarriers(c); setOrders(o); })
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.order_id) return;
    try {
      await shipmentsApi.create({
        order_id: Number(form.order_id),
        carrier_id: form.carrier_id ? Number(form.carrier_id) : null,
        delivery_type: form.delivery_type,
        cost: Number(form.cost),
      });
      setForm({ order_id: '', carrier_id: '', delivery_type: 'home', cost: 0 });
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const advance = async (s: ApiShipment) => {
    const next: ApiShipment['status'] | null =
      s.status === 'pending' ? 'printed'
      : s.status === 'printed' ? 'in_transit'
      : s.status === 'in_transit' ? 'delivered'
      : null;
    if (!next) return;
    try {
      await shipmentsApi.setStatus(s.id, next);
      toast.success('Status advanced', `Now ${next.replace('_', ' ')}.`);
      refresh();
    } catch (e) {
      toast.error('Could not advance status', humanizeError(e, lang));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete this shipment?',
      description: 'The tracking number will be released. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await shipmentsApi.remove(id);
      toast.success('Shipment removed');
      refresh();
    } catch (e) {
      toast.error('Delete failed', humanizeError(e, lang));
    }
  };

  return (
    <div className="space-y-6">
      <Section title="Shipments" subtitle="Track every handoff to the carrier, generate labels and update statuses.">
        <ErrorBox err={err} />
        {loading ? <Spin /> : items.length === 0 ? <Empty>No shipments yet. Create one below from an existing order.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-bold uppercase text-gray-500"><tr>
                <th className="px-3 py-2 text-left">Tracking #</th>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Carrier</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Cost</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {items.map(s => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">{s.tracking_number}</td>
                    <td className="px-3 py-2 text-gray-500">#{s.order_id}</td>
                    <td className="px-3 py-2 text-gray-500">{s.carrier_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{s.delivery_type}</td>
                    <td className="px-3 py-2 text-gray-500">{s.cost} DZD</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${SHIP_COLOR[s.status]}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      {s.status === 'pending' && (
                        <button onClick={() => shipmentsApi.printLabel(s.id).then(refresh)} className="px-2 py-1 text-xs font-bold bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg">Print label</button>
                      )}
                      {s.status !== 'delivered' && s.status !== 'failed' && (
                        <button onClick={() => advance(s)} className="px-2 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Advance</button>
                      )}
                      <button onClick={() => remove(s.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Create a shipment">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className={inputCls} value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} required>
            <option value="">Select order…</option>
            {orders.map(o => <option key={o.id} value={o.id}>{o.reference} — {o.product_name}</option>)}
          </select>
          <select className={inputCls} value={form.carrier_id} onChange={e => setForm({ ...form, carrier_id: e.target.value })}>
            <option value="">No carrier</option>
            {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={inputCls} value={form.delivery_type} onChange={e => setForm({ ...form, delivery_type: e.target.value as 'home' | 'desk' })}>
            <option value="home">Home delivery</option>
            <option value="desk">Desk pickup</option>
          </select>
          <input className={inputCls} type="number" min={0} placeholder="Cost (DZD)" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
          <button className={primaryBtn + ' md:col-span-4 justify-center'}><Plus className="w-4 h-4" /> Create shipment</button>
        </form>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RETURNS
// ---------------------------------------------------------------------------

const RETURN_STATUSES: ApiReturn['status'][] = ['requested', 'received', 'restocked', 'refunded', 'rejected'];

export function ReturnsTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiReturn[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [stats, setStats] = useState<{ total: number; by_status: Record<string, number>; return_rate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ order_id: '', reason: '', status: 'requested' as ApiReturn['status'], notes: '' });

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([returnsApi.list(), ordersApi.list(), returnsApi.stats()])
      .then(([r, o, s]) => { setItems(r); setOrders(o); setStats(s); })
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.order_id) return;
    try {
      await returnsApi.create({
        order_id: Number(form.order_id), reason: form.reason,
        status: form.status, notes: form.notes,
      });
      setForm({ order_id: '', reason: '', status: 'requested', notes: '' });
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const setStatus = async (r: ApiReturn, status: ApiReturn['status']) => {
    await returnsApi.update(r.id, { status });
    refresh();
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete this return record?',
      description: 'Historical analytics will lose this entry.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await returnsApi.remove(id);
      toast.success('Return removed');
      refresh();
    } catch (e) {
      toast.error('Delete failed', humanizeError(e, lang));
    }
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total returns</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Return rate</p>
            <p className="text-2xl font-black text-red-500 mt-1">{(stats.return_rate * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Refunded</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{stats.by_status.refunded || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Restocked</p>
            <p className="text-2xl font-black text-green-500 mt-1">{stats.by_status.restocked || 0}</p>
          </div>
        </div>
      )}

      <Section title="Return requests">
        <ErrorBox err={err} />
        {loading ? <Spin /> : items.length === 0 ? <Empty>No returns yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-bold uppercase text-gray-500"><tr>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Reason</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-right"></th>
              </tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 text-gray-500">#{r.order_id}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{r.reason || '—'}</td>
                    <td className="px-3 py-2">
                      <select value={r.status} onChange={e => setStatus(r, e.target.value as ApiReturn['status'])} className={inputCls}>
                        {RETURN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => remove(r.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Log a return">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className={inputCls} value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} required>
            <option value="">Select order…</option>
            {orders.map(o => <option key={o.id} value={o.id}>{o.reference} — {o.product_name}</option>)}
          </select>
          <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ApiReturn['status'] })}>
            {RETURN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={inputCls + ' md:col-span-2'} placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <textarea className={inputCls + ' md:col-span-2'} placeholder="Internal notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button className={primaryBtn + ' md:col-span-2 justify-center'}><Plus className="w-4 h-4" /> Log return</button>
        </form>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TEAM
// ---------------------------------------------------------------------------

export function TeamTab() {
  const { lang } = useApp();
  const toast = useToast();
  const confirmAction = useConfirm();
  const [items, setItems] = useState<ApiTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', role: 'confirmer', phone: '', email: '', pay_per_confirmed: 0 });

  const refresh = useCallback(() => {
    setLoading(true);
    teamApi.list().then(setItems).catch(e => setErr(humanizeError(e, lang))).finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await teamApi.create({ ...form, pay_per_confirmed: Number(form.pay_per_confirmed) });
      setForm({ name: '', role: 'confirmer', phone: '', email: '', pay_per_confirmed: 0 });
      refresh();
    } catch (e) {
      setErr(humanizeError(e, lang));
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Remove this team member?',
      description: 'They will lose access immediately.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await teamApi.remove(id);
      toast.success('Team member removed');
      refresh();
    } catch (e) {
      toast.error('Remove failed', humanizeError(e, lang));
    }
  };

  const total_payout = items.reduce((acc, m) => acc + m.payout_due, 0);

  return (
    <div className="space-y-6">
      <Section title="Team & order confirmers" subtitle={`Payroll due this cycle: ${total_payout.toLocaleString()} DZD`}>
        <ErrorBox err={err} />
        {loading ? <Spin /> : items.length === 0 ? <Empty>No team members yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-bold uppercase text-gray-500"><tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Pay / confirmed</th>
                <th className="px-3 py-2 text-left">Confirmed</th>
                <th className="px-3 py-2 text-left">Payout due</th>
                <th className="px-3 py-2 text-right"></th>
              </tr></thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{m.name}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{m.role}</td>
                    <td className="px-3 py-2 text-gray-500">{m.phone || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{m.pay_per_confirmed} DZD</td>
                    <td className="px-3 py-2 text-green-500 font-bold">{m.confirmed_count}</td>
                    <td className="px-3 py-2 text-amber-500 font-bold">{m.payout_due.toLocaleString()} DZD</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => remove(m.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Add a team member">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className={inputCls} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="confirmer">Confirmer</option>
            <option value="packer">Packer</option>
            <option value="manager">Manager</option>
            <option value="custom">Custom</option>
          </select>
          <input className={inputCls} placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className={inputCls} type="number" min={0} placeholder="Pay per confirmed (DZD)" value={form.pay_per_confirmed} onChange={e => setForm({ ...form, pay_per_confirmed: Number(e.target.value) })} />
          <button className={primaryBtn + ' justify-center'}><Plus className="w-4 h-4" /> Add member</button>
        </form>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SETTINGS (+ Webhooks)
// ---------------------------------------------------------------------------

export function SettingsTab() {
  const { lang } = useApp();
  const toast = useToast();
  const [settings, setSettings] = useState<ApiTenantSettings | null>(null);
  const [webhooks, setWebhooks] = useState<ApiWebhook[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [whForm, setWhForm] = useState({ event: 'order.created', url: '' });
  const [justCreatedSecret, setJustCreatedSecret] = useState<string>('');

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([settingsApi.get(), webhooksApi.list(), webhooksApi.events()])
      .then(([s, w, e]) => { setSettings(s); setWebhooks(w); setEvents(e.events); })
      .catch(e => setErr(humanizeError(e, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    if (!settings) return;
    try {
      const updated = await settingsApi.update(settings);
      setSettings(updated);
      setSaved(true);
      toast.success('Settings saved');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(humanizeError(e, lang));
      toast.error('Could not save', humanizeError(e, lang));
    }
  };

  const addWebhook = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const created = await webhooksApi.create({ event: whForm.event, url: whForm.url });
      if (created.secret) setJustCreatedSecret(created.secret);
      setWhForm({ event: 'order.created', url: '' });
      toast.success('Webhook added', 'Copy the secret below — it is only shown once.');
      refresh();
    } catch (e) {
      toast.error('Could not add webhook', humanizeError(e, lang));
    }
  };

  const removeWebhook = async (id: number) => {
    await webhooksApi.remove(id);
    refresh();
  };

  if (loading || !settings) return <Spin />;

  const patch = (k: keyof ApiTenantSettings, v: unknown) => setSettings({ ...settings, [k]: v } as ApiTenantSettings);

  return (
    <div className="space-y-6">
      <ErrorBox err={err} />

      <Section
        title="Company profile"
        action={
          <button onClick={save} className={primaryBtn}>
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save changes'}
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Company name" value={settings.company_name} onChange={e => patch('company_name', e.target.value)} />
          <input className={inputCls} placeholder="Phone" value={settings.company_phone} onChange={e => patch('company_phone', e.target.value)} />
          <input className={inputCls + ' md:col-span-2'} placeholder="Company address" value={settings.company_address} onChange={e => patch('company_address', e.target.value)} />
          <input className={inputCls} placeholder="Logo URL" value={settings.logo_url} onChange={e => patch('logo_url', e.target.value)} />
          <input className={inputCls} placeholder="Default currency" value={settings.default_currency} onChange={e => patch('default_currency', e.target.value)} />
          <input className={inputCls} placeholder="WhatsApp number (+213…)" value={settings.whatsapp_number} onChange={e => patch('whatsapp_number', e.target.value)} />
          <input className={inputCls} placeholder="SMS sender ID" value={settings.sms_sender_id} onChange={e => patch('sms_sender_id', e.target.value)} />
        </div>
      </Section>

      <Section title="Automation">
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Auto-confirm orders</p>
              <p className="text-xs text-gray-500">When an order comes in from a connected store, confirm it automatically.</p>
            </div>
            <input type="checkbox" checked={settings.auto_confirm_enabled} onChange={e => patch('auto_confirm_enabled', e.target.checked)} className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Auto-assign to delivery agent</p>
              <p className="text-xs text-gray-500">Match new orders to an agent whose zone matches the shipping city.</p>
            </div>
            <input type="checkbox" checked={settings.auto_assign_enabled} onChange={e => patch('auto_assign_enabled', e.target.checked)} className="w-5 h-5" />
          </label>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Customer SMS template</label>
            <textarea className={inputCls} rows={3} value={settings.customer_sms_template} onChange={e => patch('customer_sms_template', e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Placeholders: <code>{'{{reference}}'}</code>, <code>{'{{status}}'}</code>.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Fraud return threshold (customer blocked above)</label>
            <input className={inputCls} type="number" min={0} max={1} step={0.05} value={settings.fraud_return_threshold} onChange={e => patch('fraud_return_threshold', Number(e.target.value))} />
          </div>
        </div>
      </Section>

      <Section title="Webhook endpoints" subtitle="Receive POST payloads when events fire.">
        {justCreatedSecret && (
          <div className="p-3 mb-4 bg-green-900/20 border border-green-700/40 rounded-xl text-sm text-green-300 font-mono">
            <p className="mb-1 font-sans font-bold">New webhook secret (shown once):</p>
            {justCreatedSecret}
          </div>
        )}
        {webhooks.length === 0 ? <Empty>No webhooks configured.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-bold uppercase text-gray-500"><tr>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">URL</th>
                <th className="px-3 py-2 text-left">Secret</th>
                <th className="px-3 py-2 text-right"></th>
              </tr></thead>
              <tbody>
                {webhooks.map(w => (
                  <tr key={w.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">{w.event}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[260px]">{w.url}</td>
                    <td className="px-3 py-2"><Pill ok={w.secret_set}>{w.secret_set ? 'Set' : 'None'}</Pill></td>
                    <td className="px-3 py-2 text-right"><button onClick={() => removeWebhook(w.id)} className={dangerBtn}><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={addWebhook} className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <select className={inputCls} value={whForm.event} onChange={e => setWhForm({ ...whForm, event: e.target.value })}>
            {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <input className={inputCls + ' md:col-span-2'} placeholder="https://example.com/hook" value={whForm.url} onChange={e => setWhForm({ ...whForm, url: e.target.value })} required />
          <button className={primaryBtn + ' md:col-span-3 justify-center'}><Plus className="w-4 h-4" /> Add webhook</button>
        </form>
      </Section>
    </div>
  );
}
