import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const userId = safe(req.query?.user_id || req.headers['x-user-id']);

  try {
    if (req.method === 'GET') {
      let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (userId && userId !== 'demo') query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { user_id, action, entity, details, ip_address } = req.body || {};
      if (!action) return res.status(400).json(ERRORS.MISSING_FIELDS(['action']));
      const { data, error } = await supabase.from('activity_logs').insert({
        user_id: safe(user_id), action: safe(action), entity: safe(entity),
        details: details ? JSON.stringify(details) : null, ip_address: safe(ip_address),
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[logs]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('logs'));
  }
}
