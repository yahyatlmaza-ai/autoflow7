import supabase from './_supabase.js';
import { setCORSHeaders, safe, logActivity, ERRORS } from './_helpers.js';

// Plan definitions — source of truth (also in plans table)
const PLAN_PRICES = { trial: 0, basic: 20000, professional: 30000 };

async function loadPlans() {
  const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('sort_order');
  return data || [];
}

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // ── GET: fetch user subscription ──────────────────────────────────────
    if (req.method === 'GET') {
      const { email, user_id, plans: listPlans } = req.query;

      if (listPlans === 'list') {
        const plans = await loadPlans();
        return res.status(200).json(plans);
      }

      const userEmail = safe(email);
      if (!userEmail && !user_id) {
        return res.status(400).json(ERRORS.MISSING_FIELDS(['email']));
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const plans = await loadPlans();
        const planDef = plans.find(p => p.plan_key === data.plan) || {};
        // Check if trial expired
        const isTrialExpired = data.plan === 'trial' && data.trial_end && new Date(data.trial_end) < new Date();
        return res.status(200).json({
          ...data,
          is_trial_expired: isTrialExpired,
          plan_details: planDef,
        });
      }

      return res.status(200).json(null);
    }

    // ── POST: create/upgrade subscription ────────────────────────────────
    if (req.method === 'POST') {
      const user_email = safe(req.body?.user_email);
      const plan       = safe(req.body?.plan);
      const currency   = safe(req.body?.currency) || 'DZD';
      const userId     = safe(req.body?.user_id);

      if (!user_email || !plan) {
        return res.status(400).json(ERRORS.MISSING_FIELDS(['user_email', 'plan']));
      }

      const plans = await loadPlans();
      const planDef = plans.find(p => p.plan_key === plan);
      if (!planDef && plan !== 'trial') {
        return res.status(400).json({ error: `Invalid plan '${plan}'. Valid: ${plans.map(p => p.plan_key).join(', ')}.`, code: 'INVALID_PLAN' });
      }

      const amount = planDef?.amount ?? PLAN_PRICES[plan] ?? 0;

      // Cancel existing active subscriptions
      await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('user_email', user_email).eq('status', 'active').catch(() => {});

      const isTrialPlan = plan === 'trial';
      const trialEnd = isTrialPlan ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() : null;

      const { data, error } = await supabase.from('subscriptions').insert({
        user_email,
        plan,
        status: isTrialPlan ? 'trial' : 'active',
        currency,
        amount,
        trial_start: isTrialPlan ? new Date().toISOString() : null,
        trial_end: trialEnd,
      }).select().single();

      if (error) throw error;

      // Update plan in user_profiles
      if (userId) {
        await supabase.from('user_profiles').update({ plan }).eq('user_id', userId).catch(() => {});
      }
      await supabase.from('users').update({ plan }).eq('email', user_email).catch(() => {});

      // Record payment if paid plan
      if (amount > 0) {
        await supabase.from('payments').insert({
          user_id: userId || user_email,
          user_email,
          plan,
          amount,
          currency,
          status: 'pending',
          payment_method: 'manual',
          reference: `SUB-${Date.now()}`,
        }).catch(() => {});
      }

      await logActivity(supabase, userId || user_email, `Subscribed to ${plan} plan`, 'billing', { plan, amount });

      return res.status(201).json({ ...data, plan_details: planDef });
    }

    // ── PUT: update subscription status ──────────────────────────────────
    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      if (!id || !status) return res.status(400).json(ERRORS.MISSING_FIELDS(['id', 'status']));

      const { data, error } = await supabase
        .from('subscriptions').update({ status }).eq('id', safe(id)).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[subscriptions]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('subscriptions'));
  }
}
