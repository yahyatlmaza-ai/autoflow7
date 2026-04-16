import supabase from './_supabase.js';
import { setCORSHeaders, safe, getIP, logActivity, ERRORS } from './_helpers.js';

// Simple admin auth — check if user is admin
async function isAdmin(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) return false;
  if (userId === 'demo') return true; // demo has admin in demo mode
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.role === 'admin' || data?.role === 'super_admin';
}

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ip = getIP(req);
  const { resource } = req.query;

  // Admin auth check
  const admin = await isAdmin(req);
  if (!admin) return res.status(403).json(ERRORS.FORBIDDEN);

  try {
    // ── GET /api/admin?resource=users ─────────────────────────────────────
    if (req.method === 'GET' && resource === 'users') {
      const { limit = 50, offset = 0, search } = req.query;

      let query = supabase
        .from('trial_registrations')
        .select('id, email, status, ip_address, created_at, attempt_count')
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (search) {
        query = query.ilike('email', `%${safe(search)}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with profile data
      const enriched = await Promise.all((data || []).map(async (reg) => {
        const userId = 'af_' + require('crypto').createHash('sha256').update(reg.email).digest('hex').slice(0, 20);
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name, company, plan, trial_end')
          .eq('user_id', userId)
          .maybeSingle();
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status, trial_end, amount')
          .eq('user_email', reg.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...reg, profile, subscription: sub };
      }));

      return res.status(200).json(enriched);
    }

    // ── GET /api/admin?resource=stats ─────────────────────────────────────
    if (req.method === 'GET' && resource === 'stats') {
      const [usersRes, ordersRes, subsRes] = await Promise.all([
        supabase.from('trial_registrations').select('id, status, created_at'),
        supabase.from('orders').select('id, status, total, created_at'),
        supabase.from('subscriptions').select('id, plan, status, amount'),
      ]);

      const users = usersRes.data || [];
      const orders = ordersRes.data || [];
      const subs = subsRes.data || [];

      const totalRevenue = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.amount || 0), 0);
      const activeTrials = subs.filter(s => s.status === 'trial').length;
      const paidSubs = subs.filter(s => s.status === 'active').length;

      return res.status(200).json({
        total_users: users.filter(u => u.status === 'active').length,
        total_registrations: users.length,
        total_orders: orders.length,
        total_revenue: totalRevenue,
        active_trials: activeTrials,
        paid_subscriptions: paidSubs,
        orders_today: orders.filter(o => o.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length,
        plan_distribution: {
          trial: subs.filter(s => s.plan === 'trial').length,
          basic: subs.filter(s => s.plan === 'basic').length,
          professional: subs.filter(s => s.plan === 'professional').length,
        },
      });
    }

    // ── GET /api/admin?resource=subscriptions ─────────────────────────────
    if (req.method === 'GET' && resource === 'subscriptions') {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // ── GET /api/admin?resource=logs ──────────────────────────────────────
    if (req.method === 'GET' && resource === 'logs') {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // ── PUT /api/admin  — update user plan/status ─────────────────────────
    if (req.method === 'PUT') {
      const { email, plan, status, action } = req.body || {};
      if (!email) return res.status(400).json(ERRORS.MISSING_FIELDS(['email']));

      if (plan) {
        await supabase.from('user_profiles')
          .update({ plan })
          .eq('user_id', 'af_' + require('crypto').createHash('sha256').update(email).digest('hex').slice(0, 20))
          .catch(() => {});
        await supabase.from('subscriptions')
          .update({ plan, status: 'active' })
          .eq('user_email', email)
          .catch(() => {});
      }

      if (status) {
        await supabase.from('trial_registrations')
          .update({ status })
          .eq('email', email)
          .catch(() => {});
      }

      await logActivity(supabase, req.headers['x-user-id'], `Admin updated user ${email}`, 'admin', { email, plan, status }, ip);
      return res.status(200).json({ success: true });
    }

    return res.status(404).json(ERRORS.NOT_FOUND('Resource'));
  } catch (err) {
    console.error('[admin]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('admin'));
  }
}
