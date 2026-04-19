import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Play, BarChart3, Truck, Eye, EyeOff,
  Lock, Shield, AlertCircle, ArrowRight, X,
  TrendingUp, Users, ShoppingBag, CheckCircle,
  Store, Bell, Settings, LayoutDashboard, Zap,
  MessageCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { LogoIconStandalone } from '../components/Logo';

const PIE_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];

// ── Demo banner shown on every page ──────────────────────────────────────────
function DemoBanner({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-gray-900"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm font-bold">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>👀 Demo Mode — View Only. No data can be created, edited, or deleted.</span>
          <span className="hidden sm:inline text-amber-800">Sign up for full access.</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign Up Free
          </button>
          <button onClick={() => {}} className="text-amber-800 hover:text-gray-900 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Blocked action overlay ────────────────────────────────────────────────────
function BlockedOverlay({ message, onSignup }: { message: string; onSignup: () => void }) {
  return (
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-amber-400" />
      </div>
      <p className="text-white font-bold mb-1">Demo Mode</p>
      <p className="text-gray-400 text-sm mb-5">{message}</p>
      <button onClick={onSignup} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
        Sign Up Free →
      </button>
    </div>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ORDERS = [
  { id: '1', order_number: '#ORD-2847', customer_name: 'Karim Boudiaf', customer_phone: '0661234567', wilaya: 'Alger', carrier: 'Yalidine', status: 'delivered', payment_method: 'COD', total: 4500, created_at: '2025-01-16' },
  { id: '2', order_number: '#ORD-2846', customer_name: 'Sarah Meziane', customer_phone: '0772345678', wilaya: 'Oran', carrier: 'ZR Express', status: 'shipped', payment_method: 'COD', total: 8200, created_at: '2025-01-15' },
  { id: '3', order_number: '#ORD-2845', customer_name: 'Ahmed Taleb', customer_phone: '0553456789', wilaya: 'Constantine', carrier: 'Noest', status: 'processing', payment_method: 'Prepaid', total: 2800, created_at: '2025-01-15' },
  { id: '4', order_number: '#ORD-2844', customer_name: 'Lina Hadjadj', customer_phone: '0664567890', wilaya: 'Annaba', carrier: 'Yalidine', status: 'out_for_delivery', payment_method: 'COD', total: 6700, created_at: '2025-01-14' },
  { id: '5', order_number: '#ORD-2843', customer_name: 'Mohamed Khelifi', customer_phone: '0775678901', wilaya: 'Blida', carrier: 'Amana', status: 'delivered', payment_method: 'COD', total: 12500, created_at: '2025-01-14' },
  { id: '6', order_number: '#ORD-2842', customer_name: 'Fatima Benali', customer_phone: '0556789012', wilaya: 'Sétif', carrier: 'EMS Algeria', status: 'pending', payment_method: 'COD', total: 3200, created_at: '2025-01-13' },
  { id: '7', order_number: '#ORD-2841', customer_name: 'Yacine Amrani', customer_phone: '0667890123', wilaya: 'Tizi Ouzou', carrier: 'DHL', status: 'confirmed', payment_method: 'Prepaid', total: 18900, created_at: '2025-01-13' },
  { id: '8', order_number: '#ORD-2840', customer_name: 'Nadia Cherif', customer_phone: '0778901234', wilaya: 'Béjaïa', carrier: 'Yalidine', status: 'returned', payment_method: 'COD', total: 5400, created_at: '2025-01-12' },
];

const MOCK_ANALYTICS = {
  totalOrders: 2847,
  totalRevenue: 4280000,
  totalCOD: 3150000,
  delivered: 2541,
  revenueChart: [
    { date: '01/03', revenue: 285000 }, { date: '01/04', revenue: 310000 },
    { date: '01/05', revenue: 298000 }, { date: '01/06', revenue: 342000 },
    { date: '01/07', revenue: 389000 }, { date: '01/08', revenue: 356000 },
    { date: '01/09', revenue: 412000 }, { date: '01/10', revenue: 445000 },
    { date: '01/11', revenue: 398000 }, { date: '01/12', revenue: 467000 },
    { date: '01/13', revenue: 512000 }, { date: '01/14', revenue: 489000 },
    { date: '01/15', revenue: 534000 }, { date: '01/16', revenue: 578000 },
  ],
  statusChart: [
    { status: 'delivered', count: 2541 }, { status: 'shipped', count: 156 },
    { status: 'pending', count: 89 }, { status: 'processing', count: 45 },
    { status: 'returned', count: 16 },
  ],
  carrierChart: [
    { carrier: 'Yalidine', count: 1240 }, { carrier: 'ZR Express', count: 680 },
    { carrier: 'Noest', count: 420 }, { carrier: 'Amana', count: 310 },
    { carrier: 'DHL', count: 197 },
  ],
};

const STATUS_META: Record<string, { bg: string; color: string; dot: string }> = {
  pending:          { bg: 'bg-amber-100 dark:bg-amber-900/30',   color: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500' },
  confirmed:        { bg: 'bg-blue-100 dark:bg-blue-900/30',     color: 'text-blue-700 dark:text-blue-400',     dot: 'bg-blue-500' },
  processing:       { bg: 'bg-indigo-100 dark:bg-indigo-900/30', color: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  shipped:          { bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  out_for_delivery: { bg: 'bg-cyan-100 dark:bg-cyan-900/30',     color: 'text-cyan-700 dark:text-cyan-400',     dot: 'bg-cyan-500' },
  delivered:        { bg: 'bg-green-100 dark:bg-green-900/30',   color: 'text-green-700 dark:text-green-400',   dot: 'bg-green-500' },
  returned:         { bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  cancelled:        { bg: 'bg-red-100 dark:bg-red-900/30',       color: 'text-red-700 dark:text-red-400',       dot: 'bg-red-500' },
};

// ── Demo intro screen ─────────────────────────────────────────────────────────
function DemoIntro({ onStart, onSignup }: { onStart: () => void; onSignup: () => void }) {
  const { platformSettings } = useApp();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
            <LogoIconStandalone size={48} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            {platformName} <span className="text-indigo-400">Demo</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Explore the full platform interface with realistic sample data.
          </p>
        </div>

        {/* Read-only notice */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-8 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-amber-300 mb-1">View-Only Demo Environment</p>
            <p className="text-sm text-amber-200/70 leading-relaxed">
              This demo lets you explore all pages and features with preloaded data.
              <strong className="text-amber-300"> No actions can be performed</strong> — creating, editing, deleting,
              or saving data is disabled. Only verified registered users can access full functionality.
            </p>
          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Package, label: '20+ Sample Orders', desc: 'All statuses across Algerian wilayas', color: 'from-indigo-500 to-violet-500' },
            { icon: BarChart3, label: 'Live Analytics', desc: 'Revenue charts, carrier performance', color: 'from-green-500 to-emerald-500' },
            { icon: Truck, label: 'All Carriers', desc: 'Yalidine, ZR Express, DHL & more', color: 'from-blue-500 to-cyan-500' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-left">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-lg`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-white mb-1">{item.label}</div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* What's disabled */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Disabled in Demo Mode
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['Create orders', 'Edit data', 'Delete records', 'Save settings', 'Connect stores', 'API integrations'].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <X className="w-3 h-3 text-red-500 flex-shrink-0" /> {item}
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button onClick={onStart}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 w-full sm:w-auto justify-center">
            <Play className="w-5 h-5" />
            Launch Demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-green-500/30 transition-all w-full sm:w-auto justify-center">
            <MessageCircle className="w-5 h-5" />
            Chat on WhatsApp
          </a>
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">Talk to our team on WhatsApp · Full access · VIP support</p>
      </motion.div>
    </div>
  );
}

// ── Demo Dashboard (view-only) ────────────────────────────────────────────────
function DemoDashboard({ onSignup }: { onSignup: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [blockedAction, setBlockedAction] = useState<string | null>(null);
  const { theme, setTheme, platformSettings } = useApp();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  const block = (action: string) => setBlockedAction(action);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    { icon: Package, label: 'Orders', id: 'orders' },
    { icon: Truck, label: 'Shipments', id: 'shipments' },
    { icon: Store, label: 'Stores', id: 'stores' },
    { icon: Users, label: 'Customers', id: 'customers' },
    { icon: BarChart3, label: 'Analytics', id: 'analytics' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden pt-10">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-gray-900">
        <div className="max-w-full px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span>👀 Demo Mode — View Only. No data can be modified.</span>
          </div>
          <button onClick={onSignup}
            className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0">
            Sign Up Free →
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-gray-900 dark:text-white">
            <span className="text-gray-900 dark:text-white">{platformName.split(' ')[0]}</span>{' '}<span className="text-indigo-500">{platformName.split(' ').slice(1).join(' ') || ''}</span>
          </span>
          <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full">DEMO</span>
        </div>

        <div className="mx-3 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Auto-Forward</span>
            <div className="w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded-full relative opacity-50 cursor-not-allowed">
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">Disabled in demo</p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
              {item.id === 'orders' && <span className="ml-auto bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">6</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 mb-3">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">🎯 Demo Account</p>
            <p className="text-[10px] text-indigo-500 mt-0.5">View-only access • No real data</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">D</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white">Demo User</div>
              <div className="text-xs text-gray-500">demo@shipdz.dz</div>
            </div>
            <button onClick={onSignup} title="Sign up for full access" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h1 className="text-base font-black text-gray-900 dark:text-white capitalize flex-1">{activeTab}</h1>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold">
              <Eye className="w-3.5 h-3.5" /> View Only
            </div>
            <select className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none" disabled>
              <option>DZD</option>
            </select>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">3</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* ── DASHBOARD TAB ── */}
              {activeTab === 'dashboard' && (
                <div className="space-y-5">
                  {/* KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Orders', value: '2,847', icon: Package, color: 'from-indigo-500 to-violet-600', change: '+12%' },
                      { label: 'Revenue', value: '4.28M DZD', icon: TrendingUp, color: 'from-green-500 to-emerald-600', change: '+8%' },
                      { label: 'COD Amount', value: '3.15M DZD', icon: ShoppingBag, color: 'from-amber-500 to-orange-600', change: '+5%' },
                      { label: 'Delivered', value: '2,541', icon: CheckCircle, color: 'from-blue-500 to-cyan-600', change: '+15%' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-md`}>
                            <kpi.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">{kpi.change}</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">{kpi.value}</div>
                        <div className="text-xs text-gray-500">{kpi.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">Revenue Trend</h3>
                        <span className="text-xs text-gray-400">Last 14 days</span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={MOCK_ANALYTICS.revenueChart}>
                          <defs>
                            <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
                          <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#dg)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={MOCK_ANALYTICS.statusChart} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count">
                            {MOCK_ANALYTICS.statusChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {MOCK_ANALYTICS.statusChart.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                              <span className="text-gray-500 capitalize">{s.status.replace(/_/g, ' ')}</span>
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
                      <span className="text-xs text-gray-400">2,847 total</span>
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
                          {MOCK_ORDERS.slice(0, 6).map(order => {
                            const meta = STATUS_META[order.status] || STATUS_META.pending;
                            return (
                              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="px-5 py-3 font-mono text-xs text-indigo-500 font-bold">{order.order_number}</td>
                                <td className="px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white">{order.customer_name}</td>
                                <td className="px-5 py-3 text-sm text-gray-500">{order.carrier}</td>
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${meta.bg} ${meta.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                    {order.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-sm font-bold text-gray-900 dark:text-white">{order.total.toLocaleString()} DZD</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORDERS TAB ── */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                    <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-semibold">Demo mode — Orders are read-only. </span>
                    <button onClick={onSignup} className="ml-auto text-xs font-bold text-indigo-600 hover:underline">Sign up for full access →</button>
                  </div>
                  {/* Status filters (non-interactive) */}
                  <div className="flex flex-wrap gap-2">
                    {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'returned'].map((s, i) => (
                      <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                        {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${i === 0 ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          {i === 0 ? 20 : [6, 3, 2, 4, 8, 2][i - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Toolbar with blocked actions */}
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input type="text" placeholder="Search orders..." disabled className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 cursor-not-allowed" />
                    </div>
                    <button onClick={() => block('Creating orders requires a registered account.')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-400 text-sm font-bold rounded-xl cursor-not-allowed relative">
                      <Lock className="w-4 h-4" /> New Order
                    </button>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                            {['Order #', 'Customer', 'Wilaya', 'Carrier', 'Payment', 'Status', 'Total', 'Date'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {MOCK_ORDERS.map(order => {
                            const meta = STATUS_META[order.status] || STATUS_META.pending;
                            return (
                              <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                <td className="px-4 py-3.5 font-mono text-xs text-indigo-500 font-bold">{order.order_number}</td>
                                <td className="px-4 py-3.5">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{order.customer_name}</div>
                                  <div className="text-xs text-gray-400">{order.customer_phone}</div>
                                </td>
                                <td className="px-4 py-3.5 text-sm text-gray-500">{order.wilaya}</td>
                                <td className="px-4 py-3.5 text-sm text-gray-500">{order.carrier}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${order.payment_method === 'COD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                                    {order.payment_method}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${meta.bg} ${meta.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                    {order.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white">{order.total.toLocaleString()} DZD</td>
                                <td className="px-4 py-3.5 text-xs text-gray-400">{order.created_at}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ANALYTICS TAB ── */}
              {activeTab === 'analytics' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {MOCK_ANALYTICS.statusChart.map((s, i) => (
                      <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 text-center">
                        <div className="text-3xl font-black mb-1" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{s.count}</div>
                        <div className="text-xs text-gray-500 capitalize">{s.status.replace(/_/g, ' ')}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Revenue by Day</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={MOCK_ANALYTICS.revenueChart}>
                          <defs>
                            <linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff', fontSize: 12 }} />
                          <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#dg2)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Orders by Carrier</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={MOCK_ANALYTICS.carrierChart}>
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
              )}

              {/* ── STORES / CUSTOMERS / SHIPMENTS / SETTINGS TABS ── */}
              {['stores', 'customers', 'shipments', 'settings'].includes(activeTab) && (
                <div className="relative">
                  <div className="space-y-4 blur-sm pointer-events-none select-none" aria-hidden>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 h-32 animate-pulse">
                          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-800 mb-3" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3 mb-2" />
                          <div className="h-3 bg-gray-100 dark:bg-gray-800/50 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 h-64" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl p-8 text-center max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} — Demo Mode
                      </h3>
                      <p className="text-sm text-gray-500 mb-5">
                        This section is available to registered users only. Chat on WhatsApp to get VIP access right away.
                      </p>
                      <a href="https://wa.me/213794157508" target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Blocked action toast */}
      <AnimatePresence>
        {blockedAction && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-sm">{blockedAction}</span>
            <button onClick={() => setBlockedAction(null)} className="ml-2 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Demo component ───────────────────────────────────────────────────────
export default function Demo() {
  const [started, setStarted] = useState(false);
  const navigate = useNavigate();

  const handleSignup = () => navigate('/signup');

  if (started) {
    return <DemoDashboard onSignup={handleSignup} />;
  }

  return <DemoIntro onStart={() => setStarted(true)} onSignup={handleSignup} />;
}
