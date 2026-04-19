import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Building2, Phone,
  CheckCircle, Shield, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';
import { authApi } from '../lib/api';
import { humanizeError, humanizeFields } from '../lib/errorsI18n';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special', ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? barColors[score - 1] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {checks.map((c, i) => (
            <span
              key={i}
              className={`text-[10px] flex items-center gap-1 ${
                c.ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
              }`}
            >
              {c.ok ? <CheckCircle className="w-2.5 h-2.5" /> : <span className="w-2.5 h-2.5">·</span>}
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className={`text-xs font-bold ${barColors[score - 1].replace('bg-', 'text-')}`}>
            {labels[score - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Signup() {
  const { signIn, lang, platformSettings } = useApp();
  const navigate = useNavigate();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFields({});
    if (!form.full_name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.signup({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      signIn(res.access_token, res.user, res.tenant);
      navigate('/dashboard');
    } catch (e) {
      setError(humanizeError(e, lang));
      setFields(humanizeFields(e, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.8) 0%, transparent 60%)' }}
        />
        <div className="relative">
          <Link to="/" className="mb-16 block">
            <Logo size="md" variant="full" forceTheme="dark" />
          </Link>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Start your free<br />
            <span className="text-indigo-300">14-day trial</span><br />
            today.
          </h2>
          <p className="text-indigo-200 mb-8 leading-relaxed">
            No credit card required. Full access to all features during your trial.
          </p>
          <div className="space-y-3">
            {[
              'All Algerian carriers (Yalidine, ZR Express, Noest…)',
              'International carriers (DHL, FedEx, UPS, Aramex)',
              'Unlimited order imports & automation',
              'Real-time analytics & COD management',
              'Multi-store & multi-warehouse support',
              'Arabic RTL, French & English support',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-indigo-100">
                <CheckCircle className="w-4 h-4 text-indigo-300 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-3 p-4 bg-white/10 backdrop-blur rounded-2xl">
          <Shield className="w-8 h-8 text-indigo-300 flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">Secured</p>
            <p className="text-indigo-300 text-xs">Encrypted passwords · JWT sessions · Per-tenant isolation</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" variant="full" forceTheme="dark" clickable />
          </div>

          <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
          <p className="text-gray-400 mb-8 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Sign in
            </Link>
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-4 bg-red-900/30 border border-red-700/50 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Full name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your name"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-900 border rounded-2xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
                    fields.email ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-indigo-500'
                  }`}
                  required
                />
              </div>
              {fields.email && <p className="text-xs text-red-400 mt-1.5">{fields.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Company</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Acme"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="0555…"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3.5 bg-gray-900 border rounded-2xl text-white placeholder-gray-500 focus:outline-none transition-colors ${
                    fields.password ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-indigo-500'
                  }`}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  aria-label="toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
              {fields.password && <p className="text-xs text-red-400 mt-1.5">{fields.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Creating account…
                </>
              ) : (
                `Create ${platformName} account`
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            By creating an account you agree to our{' '}
            <a href="/terms" className="text-indigo-400 hover:underline">Terms</a> and{' '}
            <a href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
