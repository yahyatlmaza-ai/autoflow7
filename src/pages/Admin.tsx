import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, BarChart3, CreditCard, Activity, Shield,
  Search, RefreshCw, ChevronDown, CheckCircle,
  XCircle, Clock, TrendingUp, Package, ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';
import { formatDate, formatRelative } from '../lib/utils';

export default function Admin() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const headers = { 'X-User-Id': user?.id || 'demo' };
    try {
      const [statsRes, usersRes, subsRes, logsRes] = await Promise.all([
        fetch('/api/admin?resource=stats', { headers }),
        fetch('/api/admin?resource=users&limit=100', { headers }),
        fetch('/api/admin?resource=subscriptions', { headers }),
        fetch('/api/admin?resource=logs', { headers }),
      ]);
      const [s, u, sub, l] = await Promise.all([statsRes.json(), usersRes.json(), subsRes.json(), logsRes.json()]);
      setStats(s);
      setUsers(Array.isArray(u) ? u : []);
      setSubs(Array.isArray(sub) ? sub : []);
      setLogs(Array.isArray(l) ? l : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateUser = async (email: string, updates: any) => {
    await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || 'demo' },
      body: JSON.stringify({ email, ...updates }),
    });
    fetchAll();
  };

  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'stats', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <Logo size="sm" variant="full" />
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-black rounded-lg">ADMIN</span>
            <div className="ml-auto flex items-center gap-3">
              <button onClick={fetchAll} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab nav */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── STATS ── */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'from-indigo-500 to-violet-600' },
                    { label: 'Orders Today', value: stats.orders_today, icon: Package, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Total Orders', value: stats.total_orders, icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
                    { label: 'Active Trials', value: stats.active_trials, icon: Clock, color: 'from-amber-500 to-orange-500' },
                    { label: 'Paid Subs', value: stats.paid_subscriptions, icon: CreditCard, color: 'from-pink-500 to-rose-500' },
                    { label: 'Revenue (DZD)', value: stats.total_revenue?.toLocaleString(), icon: BarChart3, color: 'from-purple-500 to-violet-500' },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3 shadow-md`}>
                        <kpi.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-xl font-black text-gray-900 dark:text-white">{kpi.value ?? 0}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">Plan Distribution</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(stats.plan_distribution || {}).map(([plan, count]: any) => (
                      <div key={plan} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{count}</div>
                        <div className="text-xs text-gray-500 capitalize mt-1">{plan}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                          {['Email', 'Name', 'Status', 'Plan', 'Trial End', 'Registered', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredUsers.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{u.email}</td>
                            <td className="px-4 py-3.5 text-sm text-gray-500">{u.profile?.name || '-'}</td>
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                u.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                u.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-500'
                              }`}>{u.status}</span>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-gray-500 capitalize">{u.profile?.plan || u.subscription?.plan || 'trial'}</td>
                            <td className="px-4 py-3.5 text-xs text-gray-400">{formatDate(u.profile?.trial_end || u.subscription?.trial_end)}</td>
                            <td className="px-4 py-3.5 text-xs text-gray-400">{formatDate(u.created_at)}</td>
                            <td className="px-4 py-3.5">
                              <select
                                defaultValue=""
                                onChange={e => { if (e.target.value) updateUser(u.email, { plan: e.target.value }); }}
                                className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none"
                              >
                                <option value="" disabled>Set plan...</option>
                                <option value="trial">Trial</option>
                                <option value="basic">Basic</option>
                                <option value="professional">Professional</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUBSCRIPTIONS ── */}
            {activeTab === 'subscriptions' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                        {['Email', 'Plan', 'Status', 'Amount', 'Trial End', 'Created'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {subs.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{s.user_email}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white capitalize">{s.plan}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              s.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              s.status === 'trial' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>{s.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                            {s.amount ? `${s.amount.toLocaleString()} ${s.currency}` : 'Free'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.trial_end)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.created_at)}</td>
                        </tr>
                      ))}
                      {subs.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-400">No subscriptions</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── LOGS ── */}
            {activeTab === 'logs' && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.action}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">{log.user_id}</span>
                          {log.entity && <span className="text-xs text-gray-300 dark:text-gray-600">•</span>}
                          {log.entity && <span className="text-xs text-gray-400 capitalize">{log.entity}</span>}
                          {log.ip_address && <span className="text-xs text-gray-300 dark:text-gray-600">•</span>}
                          {log.ip_address && <span className="text-xs text-gray-400 font-mono">{log.ip_address}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(log.created_at)}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center py-12 text-gray-400">No activity logs</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
