import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res, 'GET, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Fetch from plans table
      const { data: plansData, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Also check platform_settings for dynamic price overrides
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('key, value')
        .like('key', 'plan_%');

      const settingsMap = {};
      (settings || []).forEach(s => { settingsMap[s.key] = s.value; });

      const plans = (plansData || []).map(p => ({
        ...p,
        // Apply dynamic price from settings if available
        amount: settingsMap[`plan_${p.plan_key}_price`]
          ? parseInt(settingsMap[`plan_${p.plan_key}_price`], 10)
          : p.amount,
        name: settingsMap[`plan_${p.plan_key}_name`] || p.name,
      }));

      return res.status(200).json(plans);
    }

    // Admin: update plan price
    if (req.method === 'PUT') {
      const { plan_key, amount, name } = req.body || {};
      if (!plan_key) return res.status(400).json(ERRORS.MISSING_FIELDS(['plan_key']));

      const updates = {};
      if (amount !== undefined) updates.amount = parseInt(amount, 10);
      if (name) updates.name = safe(name);

      const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('plan_key', safe(plan_key))
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[plans]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('plans'));
  }
}
