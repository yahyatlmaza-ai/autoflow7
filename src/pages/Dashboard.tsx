import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, TrendingUp, Users, BarChart3, Settings, LogOut,
  Bell, Search, Plus, Store, RefreshCw, ShoppingBag,
  CheckCircle, Download, Eye, Trash2, Menu, X,
  Zap, Shield, Globe, ChevronRight, ArrowUp,
  Activity, AlertCircle, Info, Building2, Phone,
  Mail, Key, Webhook, Database, Server, CreditCard,
  UserCheck, Lock, FileText, ChevronDown, Edit2, Save,
  MessageCircle, LayoutDashboard, Truck
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { formatCurrency, formatDate, formatRelative, generateOrderNumber, STATUS_META, CARRIERS, PLATFORMS, WILAYAS } from '../lib/utils';
import TrialCountdown from '../components/TrialCountdown';
import Logo from '../components/Logo';
import Toggle from '../components/ui/Toggle';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import TT from '../components/ui/Tooltip';

const PIE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#f97316','#ec4899'];

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Package, label: 'Orders', id: 'orders' },
  { icon: Truck, label: 'Shipments', id: 'shipments' },
  { icon: Store, label: 'Stores', id: 'stores' },
  { icon: Users, label: 'Customers', id: 'customers' },
  { icon: BarChart3, label: 'Analytics', id: 'analytics' },
  { icon: Bell, label: 'Notifications', id: 'notifications' },
  { icon: Activity, label: 'Activity Log', id: 'logs' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export default function Dashboard() {
  const { lang, user, setUser, theme, setTheme, currency, setCurrency, platformSettings, refreshSettings, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [autoForward, setAutoForward] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [scrollTop, setScrollTop] = useState(false);
  const [plansList, setPlansList] = useState<any>({});

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAll();
    const handler = () => setScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const fetchAll = async () => {
    setLoading(true);
    const uid = user?.id || 'demo';
    const isDemo = user?.isDemo || uid === 'demo';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!isDemo) headers['X-User-Id'] = uid;
    const hOpts = { headers };
    try {
      const [ordersRes, analyticsRes, storesRes, customersRes, notifsRes, logsRes, profileRes] = await Promise.all([
        fetch(`/api/orders?user_id=${isDemo ? '' : uid}`, hOpts),
        fetch(`/api/analytics?user_id=${isDemo ? '' : uid}`, hOpts),
        fetch(`/api/stores?user_id=${isDemo ? '' : uid}`, hOpts),
        fetch(`/api/customers?user_id=${isDemo ? '' : uid}`, hOpts),
        fetch(`/api/notifications?user_id=${uid}`),
        fetch(`/api/logs?user_id=${uid}&limit=20`),
        fetch(`/api/profiles?user_id=${uid}`),
      ]);
      const safeJson = async (r: Response) => { try { const d = await r.json(); return d; } catch { return null; } };
      const [o, a, s, c, n, l, p, plans] = await Promise.all([
        safeJson(ordersRes), safeJson(analyticsRes), safeJson(storesRes),
        safeJson(customersRes), safeJson(notifsRes), safeJson(logsRes), safeJson(profileRes),
        fetch('/api/plans').then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOrders(Array.isArray(o) ? o : []);
      setAnalytics(a && !a.error ? a : {});
      setStores(Array.isArray(s) ? s : []);
      setCustomers(Array.isArray(c) ? c : []);
      setNotifications(Array.isArray(n) ? n : []);
      setLogs(Array.isArray(l) ? l : []);
      if (p && typeof p === 'object' && !(p as any).error) { setProfile(p); setAutoForward((p as any).auto_forward || false); }
      // Plans is now an array — convert to map by plan_key
      if (Array.isArray(plans)) {
        const plansMap: any = {};
        plans.forEach((p: any) => { plansMap[p.plan_key] = p; });
        setPlansList(plansMap);
      }
    } catch (err) { console.error('[Dashboard fetchAll]', err); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    // Invalidate server session
    const token = localStorage.getItem('af_session_token');
    if (token) {
      await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', token }) }).catch(() => {});
    }
    localStorage.removeItem('af_session_token');
    localStorage.removeItem('af_user');
    localStorage.removeItem('octomatic-user');
    setUser(null);
    navigate('/');
  };

  const toggleAutoForward = async (val: boolean) => {
    setAutoForward(val);
    const uid = user?.id || 'demo';
    await Promise.all([
      fetch('/api/profiles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid, auto_forward: val }) }),
      fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_forward_global: String(val) }) }),
      fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid, action: val ? 'Enabled auto-forward' : 'Disabled auto-forward', entity: 'settings', entity_id: 'auto_forward' }) }),
    ]).catch(() => {});
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const uid = user?.id || 'demo';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!user?.isDemo) headers['X-User-Id'] = uid;
    await fetch('/api/orders', { method: 'PUT', headers, body: JSON.stringify({ id, status }) });
    fetchAll();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    const uid = user?.id || 'demo';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!user?.isDemo) headers['X-User-Id'] = uid;
    await fetch('/api/orders', { method: 'DELETE', headers, body: JSON.stringify({ id }) });
    fetchAll();
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user?.id || 'demo', mark_all: true }) });
    fetchAll();
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredOrders = orders.filter(o => {
    const ms = statusFilter === 'all' || o.status === statusFilter;
    const mq = !searchQ || o.order_number?.toLowerCase().includes(searchQ.toLowerCase()) || o.customer_name?.toLowerCase().includes(searchQ.toLowerCase());
    return ms && mq;
  });

  const platformName = platformSettings?.platform_name || 'DeliverPro';
  const isOnboarding = !profile?.onboarding_complete && stores.length === 0;

  // Trial expiry check — block access if trial ended and no active subscription
  const trialEnd = user?.trialEnd;
  const isTrialExpired = !user?.isDemo && trialEnd && new Date(trialEnd) < new Date() && user?.plan === 'trial';

  // Trial expired gate
  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Your Free Trial Has Ended</h1>
          <p className="text-gray-400 mb-8">Your 10-day free trial has expired. Upgrade to a paid plan to continue using {platformName}.</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {['basic', 'professional'].map((planKey, i) => {
              const pd = plansList[planKey] || (planKey === 'basic' ? { name: 'Basic', amount: 20000, currency: 'DZD' } : { name: 'Professional', amount: 30000, currency: 'DZD' });
              const priceStr = pd.amount ? `${pd.amount.toLocaleString()} ${pd.currency || 'DZD'}` : 'Custom';
              const descStr = pd.orders_limit === -1 ? 'Unlimited orders' : pd.orders_limit ? `${pd.orders_limit.toLocaleString()} orders/mo` : '';
              return (
                <div key={planKey} className={`p-4 rounded-2xl border-2 text-left ${i === 1 ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700'}`}>
                  {i === 1 && <span className="text-xs font-black text-indigo-400 uppercase">Popular</span>}
                  <div className="text-lg font-black text-white mt-1">{pd.name}</div>
                  <div className="text-indigo-400 font-bold">{priceStr}</div>
                  <div className="text-xs text-gray-400 mt-1">{descStr}</div>
                  <button onClick={() => navigate('/dashboard?tab=settings&section=billing')} className={`w-full mt-3 py-2 rounded-xl text-xs font-bold transition-colors ${i === 1 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-gray-600 text-gray-300 hover:bg-gray-800'}`}>Upgrade</button>
                </div>
              );
            })}
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-4 gap-2'}`}>
          {sidebarCollapsed ? (
            <Logo size="sm" variant="icon" />
          ) : (
            <Logo size="sm" variant="full" />
          )}
          <button onClick={() => setSidebarOpen(false)} className={`lg:hidden ml-auto text-gray-400 ${sidebarCollapsed ? 'hidden' : ''}`}><X className="w-4 h-4" /></button>
        </div>

        {/* Auto-forward toggle */}
        {!sidebarCollapsed && (
          <div className="mx-3 mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Auto-Forward
              </span>
              <Toggle checked={autoForward} onChange={toggleAutoForward} size="sm" />
            </div>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400">
              {autoForward ? 'Orders forwarded automatically' : 'Manual forwarding mode'}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <TT key={item.id} content={sidebarCollapsed ? item.label : ''} position="right">
              <button
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 ${sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'} ${
                  activeTab === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {orders.filter(o => o.status === 'pending').length}
                      </span>
                    )}
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </>
                )}
              </button>
            </TT>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          {!sidebarCollapsed && user?.plan === 'trial' && <TrialCountdown trialEnd={user?.trialEnd} />}
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.plan} plan</div>
                </div>
                <div className="flex items-center gap-1">
                  {(user?.isDemo || user?.role === 'admin') && (
                    <button onClick={() => navigate('/admin')} title="Admin Panel" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-base font-black text-gray-900 dark:text-white capitalize">{activeTab}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-forward indicator */}
            <TT content={autoForward ? 'Auto-forward ON' : 'Auto-forward OFF'}>
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                autoForward ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`} onClick={() => toggleAutoForward(!autoForward)}>
                <Zap className="w-3.5 h-3.5" />
                {autoForward ? 'Auto' : 'Manual'}
              </div>
            </TT>

            {/* Currency */}
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
              <option value="DZD">DZD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>

            {/* Theme */}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); setActiveTab('notifications'); }}
                className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <button onClick={fetchAll} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" id="dash-main">
          <div className="p-5 max-w-screen-2xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {isOnboarding && activeTab === 'dashboard' ? (
                    <OnboardingDashboard user={user} stores={stores} platformName={platformName} setActiveTab={setActiveTab} />
                  ) : (
                    <>
                      {activeTab === 'dashboard' && <DashboardTab analytics={analytics} orders={orders} formatCurrency={(v: number) => formatCurrency(v, currency)} autoForward={autoForward} toggleAutoForward={toggleAutoForward} />}
                      {activeTab === 'orders' && <OrdersTab orders={filteredOrders} allOrders={orders} statusFilter={statusFilter} setStatusFilter={setStatusFilter} searchQ={searchQ} setSearchQ={setSearchQ} updateOrderStatus={updateOrderStatus} deleteOrder={deleteOrder} fetchAll={fetchAll} formatCurrency={(v: number) => formatCurrency(v, currency)} selectedOrders={selectedOrders} setSelectedOrders={setSelectedOrders} autoForward={autoForward} />}
                      {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} formatCurrency={(v: number) => formatCurrency(v, currency)} />}
                      {activeTab === 'stores' && <StoresTab stores={stores} fetchAll={fetchAll} />}
                      {activeTab === 'customers' && <CustomersTab customers={customers} formatCurrency={(v: number) => formatCurrency(v, currency)} />}
                      {activeTab === 'shipments' && <ShipmentsTab orders={orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.status))} />}
                      {activeTab === 'notifications' && <NotificationsTab notifications={notifications} markAllRead={markAllRead} fetchAll={fetchAll} />}
                      {activeTab === 'logs' && <LogsTab logs={logs} />}
                      {activeTab === 'settings' && <SettingsTab user={user} profile={profile} platformSettings={platformSettings} refreshSettings={refreshSettings} autoForward={autoForward} toggleAutoForward={toggleAutoForward} fetchAll={fetchAll} plansList={plansList} />}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Scroll to top */}
          <AnimatePresence>
            {scrollTop && (
              <motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                onClick={() => document.getElementById('dash-main')?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-6 right-6 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center z-30 transition-colors">
                <ArrowUp className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── ONBOARDING ────────────────────────────────────────────────────────────────
function OnboardingDashboard({ user, stores, platformName, setActiveTab }: any) {
  const steps = [
    { id: 1, label: 'Connect Your Store', desc: 'Link Shopify, WooCommerce or any platform', done: stores.length > 0, icon: Store, action: () => setActiveTab('stores') },
    { id: 2, label: 'Configure Shipping', desc: 'Add your carrier API keys', done: false, icon: Truck, action: () => setActiveTab('settings') },
    { id: 3, label: 'Import Orders', desc: 'Sync your first orders', done: false, icon: Package, action: () => setActiveTab('orders') },
    { id: 4, label: 'Set Up Analytics', desc: 'Explore your business insights', done: false, icon: BarChart3, action: () => setActiveTab('analytics') },
  ];
  const completed = steps.filter(s => s.done).length;
  const progress = (completed / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm font-semibold mb-4">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Free Trial Active
          </div>
          <h1 className="text-3xl font-black mb-2">Welcome to {platformName}, {user?.name?.split(' ')[0] || 'there'}! 👋</h1>
          <p className="text-indigo-200 text-lg mb-6">Let's get your logistics operation up and running in just a few steps.</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-white rounded-full" />
            </div>
            <span className="text-sm font-bold">{completed}/{steps.length} complete</span>
          </div>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map((step, i) => (
          <motion.div key={step.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            onClick={step.action}
            className={`group relative bg-white dark:bg-gray-900 rounded-2xl p-5 border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl ${
              step.done ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                step.done ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50'
              }`}>
                {step.done ? <CheckCircle className="w-6 h-6 text-green-600" /> : <step.icon className="w-6 h-6 text-indigo-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-gray-900 dark:text-white">{step.label}</span>
                  {step.done && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">Done</span>}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Truck, title: 'Algerian Carriers', desc: 'Yalidine, ZR Express, Noest, Amana & EMS', color: 'from-blue-500 to-cyan-500' },
          { icon: Globe, title: 'International', desc: 'DHL, FedEx, UPS & Aramex integrated', color: 'from-violet-500 to-purple-500' },
          { icon: BarChart3, title: 'Analytics', desc: 'Real-time insights and performance reports', color: 'from-green-500 to-emerald-500' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{card.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Demo tip */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Sample data loaded</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            We've preloaded demo orders and analytics so you can explore the platform. Connect your store to start with real data.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── DASHBOARD TAB ─────────────────────────────────────────────────────────────
function DashboardTab({ analytics, orders, formatCurrency, autoForward, toggleAutoForward }: any) {
  const kpis = [
    { label: 'Total Orders', value: analytics?.totalOrders || 0, icon: Package, color: 'from-indigo-500 to-violet-600', change: '+12%', up: true },
    { label: 'Revenue', value: formatCurrency(analytics?.totalRevenue || 0), icon: TrendingUp, color: 'from-green-500 to-emerald-600', change: '+8%', up: true },
    { label: 'COD Amount', value: formatCurrency(analytics?.totalCOD || 0), icon: ShoppingBag, color: 'from-amber-500 to-orange-600', change: '+5%', up: true },
    { label: 'Delivered', value: analytics?.statusCounts?.delivered || 0, icon: CheckCircle, color: 'from-blue-500 to-cyan-600', change: '+15%', up: true },
  ];

  return (
    <div className="space-y-5">
      {/* Auto-forward banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-between p-4 rounded-2xl border ${
          autoForward ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${autoForward ? 'bg-green-500' : 'bg-gray-400'}`}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${autoForward ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
              Auto-Forward Orders: {autoForward ? 'Enabled' : 'Disabled'}
            </p>
            <p className={`text-xs ${autoForward ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {autoForward ? 'New orders are automatically forwarded to carriers' : 'Orders require manual forwarding to carriers'}
            </p>
          </div>
        </div>
        <Toggle checked={autoForward} onChange={toggleAutoForward} size="md" />
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-md`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${kpi.up ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {kpi.change}
              </span>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">{kpi.value}</div>
            <div className="text-xs text-gray-500 font-medium">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Revenue Trend</h3>
            <span className="text-xs text-gray-400">Last 14 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics?.revenueChart || []}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rg)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={analytics?.statusChart || []} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count" nameKey="status">
                {(analytics?.statusChart || []).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {(analytics?.statusChart || []).slice(0, 5).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-gray-500 dark:text-gray-400 capitalize">{s.status?.replace(/_/g, ' ')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white">Recent Orders</h3>
          <span className="text-xs text-gray-400">{orders.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                {['Order', 'Customer', 'Carrier', 'Status', 'Total'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.slice(0, 8).map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{order.order_number}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white">{order.customer_name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{order.carrier}</td>
                  <td className="px-5 py-3"><Badge status={order.status} /></td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ORDERS TAB ────────────────────────────────────────────────────────────────
function OrdersTab({ orders, allOrders, statusFilter, setStatusFilter, searchQ, setSearchQ, updateOrderStatus, deleteOrder, fetchAll, formatCurrency, selectedOrders, setSelectedOrders, autoForward }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer_name: '', customer_phone: '', wilaya: '', address: '', carrier: 'Yalidine', total: '', payment_method: 'COD', notes: '' });
  const statuses = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'returned', 'cancelled'];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const status = autoForward ? 'confirmed' : 'pending';
    await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newOrder, order_number: generateOrderNumber(), status, total: Number(newOrder.total) }),
    });
    setShowAdd(false);
    setNewOrder({ customer_name: '', customer_phone: '', wilaya: '', address: '', carrier: 'Yalidine', total: '', payment_method: 'COD', notes: '' });
    fetchAll();
  };

  const bulkUpdate = async (status: string) => {
    if (!status) return;
    await Promise.all(selectedOrders.map((id: string) =>
      fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    ));
    setSelectedOrders([]);
    fetchAll();
  };

  return (
    <div className="space-y-4">
      {/* Auto-forward notice */}
      {autoForward && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl text-sm text-green-700 dark:text-green-400">
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">Auto-forward is ON</span> — New orders will be automatically confirmed and forwarded to carriers.
        </div>
      )}

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => {
          const count = s === 'all' ? allOrders.length : allOrders.filter((o: any) => o.status === s).length;
          const meta = STATUS_META[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
              }`}>
              {s !== 'all' && meta && <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === s ? 'bg-white' : meta.dot}`} />}
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search orders, customers..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-colors" />
        </div>
        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">{selectedOrders.length} selected</span>
            <select onChange={e => bulkUpdate(e.target.value)} defaultValue=""
              className="text-sm px-3 py-2.5 bg-indigo-600 text-white rounded-xl border-none focus:outline-none cursor-pointer">
              <option value="" disabled>Bulk status...</option>
              {statuses.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        )}
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md hover:shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" onChange={e => setSelectedOrders(e.target.checked ? orders.map((o: any) => o.id) : [])} className="rounded border-gray-300" />
                </th>
                {['Order #', 'Customer', 'Wilaya', 'Carrier', 'Payment', 'Status', 'Total', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No orders found
                </td></tr>
              ) : orders.map((order: any) => (
                <tr key={order.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${selectedOrders.includes(order.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                  <td className="px-4 py-3.5">
                    <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => setSelectedOrders((p: string[]) => p.includes(order.id) ? p.filter((x: string) => x !== order.id) : [...p, order.id])} className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-indigo-500 dark:text-indigo-400 font-bold whitespace-nowrap">{order.order_number}</td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{order.customer_name}</div>
                    <div className="text-xs text-gray-400">{order.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{order.wilaya}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{order.carrier}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full ${order.payment_method === 'COD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                      {order.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border-none focus:outline-none cursor-pointer appearance-none ${STATUS_META[order.status]?.bg || 'bg-gray-100'} ${STATUS_META[order.status]?.color || 'text-gray-600'}`}>
                      {statuses.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteOrder(order.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Order Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create New Order" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Customer Name *</label>
              <input type="text" value={newOrder.customer_name} onChange={e => setNewOrder({...newOrder, customer_name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Phone</label>
              <input type="text" value={newOrder.customer_phone} onChange={e => setNewOrder({...newOrder, customer_phone: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Wilaya</label>
              <select value={newOrder.wilaya} onChange={e => setNewOrder({...newOrder, wilaya: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500">
                <option value="">Select wilaya...</option>
                {WILAYAS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Carrier</label>
              <select value={newOrder.carrier} onChange={e => setNewOrder({...newOrder, carrier: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500">
                {CARRIERS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Address</label>
            <input type="text" value={newOrder.address} onChange={e => setNewOrder({...newOrder, address: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Total (DZD) *</label>
              <input type="number" value={newOrder.total} onChange={e => setNewOrder({...newOrder, total: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Payment</label>
              <select value={newOrder.payment_method} onChange={e => setNewOrder({...newOrder, payment_method: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500">
                <option value="COD">COD</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
          </div>
          {autoForward && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-xs text-green-700 dark:text-green-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> Auto-forward is ON — this order will be auto-confirmed
            </div>
          )}
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors">
            Create Order
          </button>
        </form>
      </Modal>
    </div>
  );
}

// ─── ANALYTICS TAB ─────────────────────────────────────────────────────────────
function AnalyticsTab({ analytics, formatCurrency }: any) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(analytics?.statusChart || []).map((s: any, i: number) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 text-center">
            <div className="text-3xl font-black mb-1" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{s.count}</div>
            <div className="text-xs text-gray-500 capitalize font-medium">{s.status?.replace(/_/g, ' ')}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Revenue by Day</h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={analytics?.revenueChart || []}>
              <defs>
                <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rg2)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Orders by Carrier</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics?.carrierChart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="carrier" tick={{ fontSize: 9, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── STORES TAB ────────────────────────────────────────────────────────────────
function StoresTab({ stores, fetchAll }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'Shopify', url: '', api_key: '' });
  const platformIcons: Record<string, string> = { Shopify: '🛍️', WooCommerce: '🛒', Magento: '🔶', OpenCart: '🛒', 'Custom API': '🔧' };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: 'active', orders_count: 0 }) });
    setShowAdd(false);
    setForm({ name: '', platform: 'Shopify', url: '', api_key: '' });
    fetchAll();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Connected Stores</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Connect Store
        </button>
      </div>
      {stores.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
          <Store className="w-14 h-14 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No stores connected</h3>
          <p className="text-gray-500 mb-5">Connect your first e-commerce store to start importing orders</p>
          <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">Connect Your First Store</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store: any) => (
          <div key={store.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{platformIcons[store.platform] || '🛍️'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">{store.name}</div>
                <div className="text-xs text-gray-400">{store.platform}</div>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full flex-shrink-0 ${store.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {store.status}
              </span>
            </div>
            <div className="text-xs text-gray-400 truncate mb-3">{store.url || 'No URL configured'}</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{store.orders_count || 0} orders</span>
              <button className="text-xs text-indigo-500 hover:text-indigo-700 font-bold transition-colors">Sync Now →</button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Connect Store" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">Store Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">Platform</label>
            <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500">
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">Store URL</label>
            <input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://mystore.myshopify.com" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">API Key</label>
            <input type="password" value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} placeholder="shpat_xxxxxxxxxxxx" className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors">Connect Store</button>
        </form>
      </Modal>
    </div>
  );
}

// ─── CUSTOMERS TAB ─────────────────────────────────────────────────────────────
function CustomersTab({ customers, formatCurrency }: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Customers</h2>
        <span className="text-sm text-gray-400 font-medium">{customers.length} total</span>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                {['Customer', 'Phone', 'Wilaya', 'Orders', 'Total Spent', 'Last Order'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{c.phone}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{c.wilaya}</td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900 dark:text-white">{c.orders_count || 0}</td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(c.total_spent || 0)}</td>
                  <td className="px-5 py-4 text-xs text-gray-400">{formatDate(c.last_order_date)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No customers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SHIPMENTS TAB ─────────────────────────────────────────────────────────────
function ShipmentsTab({ orders }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-gray-900 dark:text-white">Active Shipments</h2>
      {orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
          <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No active shipments</p>
        </div>
      ) : orders.map((order: any) => (
        <div key={order.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 flex items-center gap-4 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <Truck className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{order.order_number}</span>
              <Badge status={order.status} />
            </div>
            <div className="font-bold text-gray-900 dark:text-white">{order.customer_name}</div>
            <div className="text-sm text-gray-400">{order.wilaya} • {order.carrier}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-gray-400 mb-1">Tracking</div>
            <div className="font-mono text-sm text-indigo-500 font-bold">{order.tracking_number || 'Pending'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── NOTIFICATIONS TAB ─────────────────────────────────────────────────────────
function NotificationsTab({ notifications, markAllRead, fetchAll }: any) {
  const iconMap: Record<string, any> = { order: Package, delivery: CheckCircle, warning: AlertCircle, system: Info };
  const colorMap: Record<string, string> = { order: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600', delivery: 'bg-green-100 dark:bg-green-900/30 text-green-600', warning: 'bg-red-100 dark:bg-red-900/30 text-red-600', system: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' };
  const unread = notifications.filter((n: any) => !n.read).length;

  const deleteNotif = async (id: string) => {
    await fetch('/api/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchAll();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Notifications</h2>
          {unread > 0 && <p className="text-sm text-gray-400 mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Mark all read
          </button>
        )}
      </div>
      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No notifications</p>
          </div>
        )}
        {notifications.map((n: any) => {
          const Icon = iconMap[n.type] || Info;
          return (
            <motion.div key={n.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                !n.read ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-70'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[n.type] || 'bg-gray-100 text-gray-600'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
              </div>
              <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────────
function LogsTab({ logs }: any) {
  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-black text-gray-900 dark:text-white">Activity Log</h2>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No activity yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.action}</p>
                  {log.entity && <p className="text-xs text-gray-400 mt-0.5">{log.entity} {log.entity_id ? `• ${log.entity_id}` : ''}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────
function SettingsTab({ user, profile, platformSettings, refreshSettings, autoForward, toggleAutoForward, fetchAll, plansList }: any) {
  const [section, setSection] = useState('branding');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [brandForm, setBrandForm] = useState({
    platform_name: platformSettings?.platform_name || 'DeliverPro',
    platform_tagline: platformSettings?.platform_tagline || '',
    platform_logo_url: platformSettings?.platform_logo_url || '',
    platform_primary_color: platformSettings?.platform_primary_color || '#6366f1',
    support_whatsapp: platformSettings?.support_whatsapp || '213794157508',
    support_email: platformSettings?.support_email || '',
  });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    company: profile?.company || '',
    phone: profile?.phone || '',
    wilaya: profile?.wilaya || '',
  });

  const saveBranding = async () => {
    setSaving(true);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brandForm) });
    await refreshSettings();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveProfile = async () => {
    setSaving(true);
    await fetch('/api/profiles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user?.id || 'demo', ...profileForm }) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id: 'branding', label: 'Branding', icon: Building2 },
    { id: 'profile', label: 'Profile', icon: UserCheck },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'integrations', label: 'Integrations', icon: Webhook },
    { id: 'carriers', label: 'Carriers', icon: Truck },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="flex gap-5">
      {/* Settings sidebar */}
      <div className="w-48 flex-shrink-0 hidden md:block">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-2 space-y-0.5">
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                section === s.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile section picker */}
      <div className="md:hidden w-full">
        <select value={section} onChange={e => setSection(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none mb-4">
          {sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          {section === 'branding' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Platform Branding</h3>
                <p className="text-sm text-gray-500">Customize the platform name, logo, and appearance</p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40">
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3">Live Preview</p>
                <div className="flex items-start gap-6 flex-wrap">
                  {/* Navbar preview */}
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider font-bold">Navbar</p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${brandForm.platform_primary_color || '#6366f1'}, #7c3aed)` }}>
                        <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
                          <circle cx="16" cy="15" r="4.5" fill="white" opacity="0.95" />
                          <path d="M16 10.5 L16 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
                          <path d="M20.5 15 L27 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
                          <path d="M11.5 15 L5 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
                          <circle cx="16" cy="15" r="2" fill="rgba(129,140,248,0.9)" />
                        </svg>
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        {(brandForm.platform_name || 'Platform').slice(0, Math.ceil((brandForm.platform_name || 'Platform').length / 2))}
                        <span style={{ color: brandForm.platform_primary_color || '#6366f1' }}>
                          {(brandForm.platform_name || 'Platform').slice(Math.ceil((brandForm.platform_name || 'Platform').length / 2))}
                        </span>
                      </span>
                    </div>
                  </div>
                  {/* Favicon preview */}
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider font-bold">Favicon</p>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${brandForm.platform_primary_color || '#6366f1'}, #7c3aed)` }}>
                      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
                        <circle cx="16" cy="15" r="4.5" fill="white" opacity="0.95" />
                        <path d="M16 10.5 L16 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M20.5 15 L27 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M11.5 15 L5 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="16" cy="15" r="2" fill="rgba(129,140,248,0.9)" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-3 italic">{brandForm.platform_tagline}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Platform Name', key: 'platform_name', type: 'text', placeholder: 'DeliverPro' },
                  { label: 'Tagline', key: 'platform_tagline', type: 'text', placeholder: "Algeria's #1 Logistics Platform" },
                  { label: 'Logo URL', key: 'platform_logo_url', type: 'url', placeholder: 'https://...' },
                  { label: 'Primary Color', key: 'platform_primary_color', type: 'color', placeholder: '' },
                  { label: 'WhatsApp Number', key: 'support_whatsapp', type: 'text', placeholder: '213794157508' },
                  { label: 'Support Email', key: 'support_email', type: 'email', placeholder: 'support@example.com' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">{field.label}</label>
                    <input type={field.type} value={(brandForm as any)[field.key]} onChange={e => setBrandForm({...brandForm, [field.key]: e.target.value})} placeholder={field.placeholder}
                      className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors ${field.type === 'color' ? 'h-11 cursor-pointer' : ''}`} />
                  </div>
                ))}
              </div>
              <button onClick={saveBranding} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60">
                {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Branding</>}
              </button>
            </div>
          )}

          {section === 'profile' && (
            <div className="space-y-5">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Your Profile</h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full capitalize">{user?.plan} plan</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name', icon: UserCheck },
                  { label: 'Company', key: 'company', icon: Building2 },
                  { label: 'Phone', key: 'phone', icon: Phone },
                  { label: 'Wilaya', key: 'wilaya', icon: Globe },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">{field.label}</label>
                    <div className="relative">
                      <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={(profileForm as any)[field.key]} onChange={e => setProfileForm({...profileForm, [field.key]: e.target.value})}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
                {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Profile</>}
              </button>
            </div>
          )}

          {section === 'automation' && (
            <div className="space-y-5">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Order Automation</h3>
              <div className="space-y-3">
                <div className={`p-5 rounded-2xl border-2 transition-all ${autoForward ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoForward ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Automatic Order Forwarding</p>
                        <p className="text-xs text-gray-500">Automatically forward new orders to shipping carriers</p>
                      </div>
                    </div>
                    <Toggle checked={autoForward} onChange={toggleAutoForward} size="lg" />
                  </div>
                  <div className={`text-sm font-semibold ${autoForward ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>
                    Status: {autoForward ? '✅ Enabled — Orders are auto-forwarded' : '⏸️ Disabled — Manual forwarding required'}
                  </div>
                </div>
                {[
                  { label: 'Auto-confirm Orders', desc: 'Automatically confirm pending orders', enabled: autoForward },
                  { label: 'Auto-generate Labels', desc: 'Generate shipping labels automatically', enabled: false },
                  { label: 'Auto-send Tracking SMS', desc: 'Send tracking updates to customers via SMS', enabled: true },
                  { label: 'Auto-retry Failed Deliveries', desc: 'Retry failed delivery attempts automatically', enabled: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <Toggle checked={item.enabled} onChange={() => {}} size="md" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'integrations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">API Integrations</h3>
              {[
                { name: 'Shopify', status: 'connected', icon: '🛍️' },
                { name: 'WooCommerce', status: 'disconnected', icon: '🛒' },
                { name: 'Yalidine API', status: 'connected', icon: '📦' },
                { name: 'ZR Express API', status: 'connected', icon: '🚚' },
                { name: 'Noest API', status: 'disconnected', icon: '⚡' },
                { name: 'SMTP Email', status: 'connected', icon: '📧' },
                { name: 'SMS Gateway', status: 'connected', icon: '📱' },
                { name: 'WhatsApp API', status: 'connected', icon: '💬' },
                { name: 'Webhook Endpoint', status: 'connected', icon: '🔗' },
              ].map((int, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <span className="text-2xl">{int.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{int.name}</p>
                    <span className={`text-xs font-bold ${int.status === 'connected' ? 'text-green-600' : 'text-gray-400'}`}>{int.status}</span>
                  </div>
                  <button className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors ${int.status === 'connected' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-200' : 'bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200'}`}>
                    {int.status === 'connected' ? 'Configure' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {section === 'carriers' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Carrier API Keys</h3>
              <div className="grid grid-cols-1 gap-3">
                {CARRIERS.map((carrier, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <span className="font-semibold text-gray-900 dark:text-white w-32 flex-shrink-0">{carrier}</span>
                    <input type="password" placeholder="Enter API key..." className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                    <button className="text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">Save</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Security & Access</h3>
                <p className="text-sm text-gray-500">Configure authentication, OTP, and access control settings.</p>
              </div>

              {/* OTP Configuration */}
              <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl">
                <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> OTP Authentication
                </h4>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mb-4">One-Time Passwords are cryptographically hashed, time-limited (5 min), single-use, and rate-limited.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'OTP on Registration', desc: 'Email OTP required for new accounts', enabled: true, icon: Mail },
                    { label: 'OTP on Login (2FA)', desc: 'Optional 2FA via email OTP', enabled: true, icon: Lock },
                    { label: 'SMS OTP', desc: 'Send OTP via SMS gateway', enabled: false, icon: Phone },
                    { label: 'OTP on Password Reset', desc: 'Verify identity before reset', enabled: true, icon: Key },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <Toggle checked={item.enabled} onChange={() => {}} size="sm" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'OTP Length', value: '6 digits' },
                    { label: 'Expiry', value: '5 minutes' },
                    { label: 'Max Attempts', value: '5 tries' },
                    { label: 'Resend Cooldown', value: '60 seconds' },
                  ].map((s, i) => (
                    <div key={i} className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other security */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'IP Monitoring', desc: 'Alert on suspicious logins', enabled: true, icon: Shield },
                  { label: 'Device Fingerprinting', desc: 'Track and verify devices', enabled: true, icon: Database },
                  { label: 'Rate Limiting', desc: 'Block brute-force attempts', enabled: true, icon: Lock },
                  { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes', enabled: false, icon: Key },
                  { label: 'XSS Protection', desc: 'Input sanitization active', enabled: true, icon: Shield },
                  { label: 'CSRF Protection', desc: 'Token validation on mutations', enabled: true, icon: Shield },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                    <Toggle checked={item.enabled} onChange={() => {}} size="sm" />
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Role-Based Access Control</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: 'Admin', desc: 'Full access' },
                    { role: 'Manager', desc: 'Orders + reports' },
                    { role: 'Staff', desc: 'Orders only' },
                    { role: 'Viewer', desc: 'Read only' },
                  ].map((r, i) => (
                    <div key={i} className={`p-3 rounded-xl text-center border-2 cursor-pointer transition-all ${i === 0 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300'}`}>
                      <p className="text-xs font-black">{r.role}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { label: 'New Order Alerts', desc: 'Notify on new orders', enabled: true },
                  { label: 'Delivery Updates', desc: 'Notify when delivered', enabled: true },
                  { label: 'Failed Deliveries', desc: 'Alert on delivery failures', enabled: true },
                  { label: 'Return Alerts', desc: 'Notify on returns', enabled: false },
                  { label: 'WhatsApp Notifications', desc: 'Send via WhatsApp', enabled: true },
                  { label: 'Email Notifications', desc: 'Send via Email', enabled: true },
                  { label: 'SMS Notifications', desc: 'Send via SMS', enabled: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <Toggle checked={item.enabled} onChange={() => {}} size="md" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'billing' && (
            <div className="space-y-5">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Billing & Subscription</h3>
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Current Plan</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white capitalize mb-1">{user?.plan || 'Trial'}</div>
                {user?.trialEnd && <div className="text-sm text-gray-500">Trial ends: {formatDate(user.trialEnd)}</div>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['basic', 'professional', 'enterprise'].map((planKey, i) => {
                  const pd = plansList?.[planKey] || {};
                  const name = pd.name || (planKey === 'basic' ? 'Basic' : planKey === 'professional' ? 'Professional' : 'Enterprise');
                  const amount = pd.amount;
                  const priceStr = planKey === 'enterprise' ? 'Custom' : amount ? `${Number(amount).toLocaleString()} ${pd.currency || 'DZD'}` : (planKey === 'basic' ? '20,000 DZD' : '30,000 DZD');
                  const features = pd.features || (planKey === 'basic' ? ['2,000 orders/mo', '5 stores', 'All Algerian carriers', 'Analytics', 'Email support'] : planKey === 'professional' ? ['Unlimited orders', 'Unlimited stores', 'All carriers', 'Advanced analytics', 'Priority support', 'COD management', 'API access'] : ['Custom limits', 'Dedicated infra', 'SLA guarantee', 'White label', 'Dedicated support']);
                  const isRecommended = pd.recommended || planKey === 'professional';
                  return (
                    <div key={planKey} className={`p-4 rounded-2xl border-2 transition-all ${isRecommended ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                      {isRecommended && <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">Recommended</span>}
                      <div className="text-lg font-black text-gray-900 dark:text-white mt-1">{name}</div>
                      <div className="text-xl font-black text-indigo-600 my-2">{priceStr}<span className="text-sm font-normal text-gray-400">/mo</span></div>
                      <ul className="space-y-1 mb-4">
                        {features.map((f: string, j: number) => <li key={j} className="text-xs text-gray-500 flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-500" />{f}</li>)}
                      </ul>
                      <button className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${isRecommended ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {planKey === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors">
                <MessageCircle className="w-4 h-4" /> Contact Sales on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
