import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, CheckCircle, MessageCircle, Zap, X, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Plan {
  plan_key: string;
  name: string;
  amount: number;
  currency: string;
  is_recommended: boolean;
  features?: string[];
}

export default function TrialExpiredWall({ onClose }: { onClose?: () => void }) {
  const { user, platformSettings } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const waNumber = platformSettings?.support_whatsapp || '213794157508';

  useEffect(() => {
    fetch('/api/subscriptions?plans=list')
      .then(r => r.json())
      .then(data => {
        // Only show paid plans (not trial)
        const paid = (Array.isArray(data) ? data : []).filter((p: Plan) => p.plan_key !== 'trial' && p.amount > 0);
        setPlans(paid);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planKey: string) => {
    setSubscribing(planKey);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify({
          user_email: user?.email,
          user_id: user?.id,
          plan: planKey,
          currency: 'DZD',
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch {}
    finally { setSubscribing(null); }
  };

  const planFeatures: Record<string, string[]> = {
    basic: ['2,000 orders/month', '5 stores', 'All Algerian carriers', 'Analytics & reports', 'COD management', 'Email support'],
    professional: ['Unlimited orders', 'Unlimited stores', 'All carriers (DZ + International)', 'Advanced analytics', 'Priority support', 'COD management', 'API access', 'Multi-warehouse'],
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Subscription Activated!</h2>
          <p className="text-gray-500">Reloading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl my-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Your Free Trial Has Ended</h1>
          <p className="text-gray-400 text-lg">
            Choose a plan to continue using {platformSettings?.platform_name || 'DeliverPro'} and keep your data.
          </p>
        </div>

        {/* Plans */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            {plans.map((plan) => {
              const features = plan.features || planFeatures[plan.plan_key] || [];
              return (
                <motion.div
                  key={plan.plan_key}
                  whileHover={{ scale: 1.02 }}
                  className={`relative rounded-3xl p-6 border-2 ${
                    plan.is_recommended
                      ? 'bg-gradient-to-b from-indigo-600 to-violet-700 border-transparent text-white shadow-2xl shadow-indigo-500/30'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {plan.is_recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-gray-900 text-xs font-black rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Most Popular
                    </div>
                  )}
                  <h3 className={`text-xl font-black mb-2 ${plan.is_recommended ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className={`text-4xl font-black ${plan.is_recommended ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {plan.amount.toLocaleString()}
                    </span>
                    <span className={`text-sm ml-1 ${plan.is_recommended ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {plan.currency}/month
                    </span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {features.map((feat: string, j: number) => (
                      <li key={j} className={`flex items-center gap-2 text-sm ${
                        plan.is_recommended ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.is_recommended ? 'text-indigo-200' : 'text-indigo-500'}`} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.plan_key)}
                    disabled={subscribing !== null}
                    className={`w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                      plan.is_recommended
                        ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {subscribing === plan.plan_key ? (
                      <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing...</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Subscribe Now</>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Contact */}
        <div className="text-center space-y-3">
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-colors"
          >
            <MessageCircle className="w-5 h-5" /> Contact Sales on WhatsApp
          </a>
          {onClose && (
            <div>
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 mx-auto">
                <X className="w-3.5 h-3.5" /> Continue with limited access
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
