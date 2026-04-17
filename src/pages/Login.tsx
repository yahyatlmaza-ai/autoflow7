import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Eye, EyeOff, Mail, Lock, AlertCircle, Sun, Moon, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi } from '../lib/api';
import { humanizeError, humanizeFields } from '../lib/errorsI18n';

export default function Login() {
  const { signIn, theme, setTheme, lang, platformSettings } = useApp();
  const navigate = useNavigate();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFields({});
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim().toLowerCase(), password });
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.8) 0%, transparent 60%)' }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white">
              auto <span className="text-indigo-300">Flow</span>
            </span>
          </Link>
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">
            Welcome back<br />to your<br /><span className="text-indigo-300">logistics hub.</span>
          </h2>
          <p className="text-indigo-200 text-lg mb-10">
            Manage orders, track shipments, and grow your business.
          </p>
        </div>
        <div className="relative text-indigo-400 text-xs">© 2025 {platformName}. All rights reserved.</div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="lg:hidden flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-gray-900 dark:text-white">
                auto <span className="text-indigo-500">Flow</span>
              </span>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="ml-auto p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              aria-label="toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Sign in</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-500 hover:text-indigo-400 font-semibold">
              Start free trial
            </Link>
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-2xl mb-6"
              >
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    fields.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500'
                  }`}
                  required
                />
              </div>
              {fields.email && <p className="text-xs text-red-500 mt-1.5">{fields.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            By signing in you agree to our{' '}
            <a href="#" className="text-indigo-400 hover:underline">Terms</a> and{' '}
            <a href="#" className="text-indigo-400 hover:underline">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
