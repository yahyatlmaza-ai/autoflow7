import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, MessageCircle, Zap, X, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { subscriptionsApi, type ApiSubscriptionStatus } from '../lib/api';
import { humanizeError } from '../lib/errorsI18n';

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['500 orders / month', '2 stores', '5 carriers', 'Email support'],
  professional: ['5,000 orders / 180 days', 'Unlimited stores', 'All carriers', 'Priority support'],
  vip: ['Unlimited orders · 5.5 years', 'Dedicated account manager', 'VIP WhatsApp 24/7', 'AI optimizer & white-label'],
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  vip: 'VIP Lifetime',
};

export default function TrialExpiredWall({ onClose }: { onClose?: () => void }) {
  const { platformSettings, subscription, refreshSubscription, lang } = useApp();
  const waNumber = platformSettings?.support_whatsapp || '213794157508';
  const [status, setStatus] = useState<ApiSubscriptionStatus | null>(subscription);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!subscription) {
      void subscriptionsApi.status().then(setStatus).catch(() => { /* ignore */ });
    } else {
      setStatus(subscription);
    }
  }, [subscription]);

  const handleSubscribe = async (plan: 'starter' | 'professional' | 'vip') => {
    setErr('');
    setSubscribing(plan);
    try {
      await subscriptionsApi.upgrade(plan);
      await refreshSubscription();
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setErr(humanizeError(e, lang));
    } finally {
      setSubscribing(null);
    }
  };

  const plans: Array<{ key: 'starter' | 'professional' | 'vip'; recommended?: boolean; duration: string }> = [
    { key: 'starter', duration: '14 days' },
    { key: 'professional', recommended: true, duration: '180 days' },
    { key: 'vip', duration: '5.5 years' },
  ];

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center max-w-sm w-full"
        >
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Subscription activated</h2>
          <p className="text-gray-500">Reloading your dashboard…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-4xl my-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Your free trial has ended</h1>
          <p className="text-gray-400 text-lg">
            Choose a plan to continue using {platformSettings?.platform_name || 'auto Flow'} and keep your data.
          </p>
        </div>

        {err && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-2xl text-sm text-red-200 text-center">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {plans.map(({ key, recommended, duration }) => {
            const info = status?.plans?.[key];
            const price = info?.price_dzd ?? 0;
            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                className={`relative rounded-3xl p-6 border-2 ${
                  recommended
                    ? 'bg-gradient-to-b from-indigo-600 to-violet-700 border-transparent text-white shadow-2xl shadow-indigo-500/30'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                {recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-gray-900 text-xs font-black rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-black mb-2 ${recommended ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {PLAN_LABEL[key]}
                </h3>
                <div className="mb-1">
                  <span className={`text-4xl font-black ${recommended ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {price.toLocaleString()}
                  </span>
                  <span className={`text-sm ml-1 ${recommended ? 'text-indigo-200' : 'text-gray-400'}`}>DZD</span>
                </div>
                <p className={`text-xs mb-4 ${recommended ? 'text-indigo-200' : 'text-gray-500'}`}>{duration}</p>
                <ul className="space-y-2 mb-6">
                  {(PLAN_FEATURES[key] || []).map((feat, j) => (
                    <li
                      key={j}
                      className={`flex items-center gap-2 text-sm ${
                        recommended ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${recommended ? 'text-indigo-200' : 'text-indigo-500'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={subscribing !== null}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                    recommended
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {subscribing === key ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Subscribe now
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center space-y-3">
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-colors"
          >
            <MessageCircle className="w-5 h-5" /> Contact sales on WhatsApp
          </a>
          {onClose && (
            <div>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 mx-auto"
              >
                <X className="w-3.5 h-3.5" /> Continue with limited access
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
