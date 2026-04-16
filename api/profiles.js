import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const user_id = safe(req.query?.user_id);
      if (!user_id) return res.status(400).json(ERRORS.MISSING_FIELDS(['user_id']));

      const { data, error } = await supabase
        .from('user_profiles').select('*').eq('user_id', user_id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return res.status(200).json(data || null);
    }

    if (req.method === 'PUT') {
      const { user_id, ...updates } = req.body || {};
      if (!user_id) return res.status(400).json(ERRORS.MISSING_FIELDS(['user_id']));

      const allowed = ['name', 'company', 'phone', 'wilaya', 'theme', 'language', 'currency', 'auto_forward', 'onboarding_complete', 'onboarding_step', 'avatar_url'];
      const safeUpdates = {};
      allowed.forEach(k => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });

      const { data: existing } = await supabase.from('user_profiles').select('id').eq('user_id', safe(user_id)).maybeSingle();

      let data, error;
      if (existing) {
        ({ data, error } = await supabase.from('user_profiles').update(safeUpdates).eq('user_id', safe(user_id)).select().single());
      } else {
        ({ data, error } = await supabase.from('user_profiles').insert({ user_id: safe(user_id), ...safeUpdates }).select().single());
      }
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[profiles]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('profiles'));
  }
}
