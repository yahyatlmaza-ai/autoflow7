import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS, isAdminUser, PLATFORM_NAME } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res, 'GET, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('platform_settings').select('key, value');
      if (error) throw error;
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      // Ensure platform name is always populated so the frontend has a fallback.
      if (!map.platform_name) map.platform_name = PLATFORM_NAME;
      return res.status(200).json(map);
    }

    if (req.method === 'PUT') {
      // PUT is platform-wide config — restrict to authenticated admins only.
      const admin = await isAdminUser(supabase, req);
      if (!admin) return res.status(403).json(ERRORS.FORBIDDEN);
      const updates = req.body || {};
      const results = [];
      for (const [key, value] of Object.entries(updates)) {
        const safeKey = safe(key, 100);
        const safeVal = safe(String(value), 2000);
        const { data: existing } = await supabase.from('platform_settings').select('id').eq('key', safeKey).maybeSingle();
        if (existing) {
          const { data } = await supabase.from('platform_settings').update({ value: safeVal, updated_at: new Date().toISOString() }).eq('key', safeKey).select().single();
          if (data) results.push(data);
        } else {
          const { data } = await supabase.from('platform_settings').insert({ key: safeKey, value: safeVal }).select().single();
          if (data) results.push(data);
        }
      }
      return res.status(200).json({ success: true, updated: results.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[settings]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('settings'));
  }
}
