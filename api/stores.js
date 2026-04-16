import supabase from './_supabase.js';
import { setCORSHeaders, safe, logActivity, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const userId = safe(req.headers['x-user-id'] || req.query?.user_id);

  try {
    if (req.method === 'GET') {
      let query = supabase.from('stores').select('*').order('created_at', { ascending: false });
      if (userId && userId !== 'demo') query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { name, platform, url, api_key } = req.body || {};
      if (!name) return res.status(400).json(ERRORS.MISSING_FIELDS(['name']));
      const { data, error } = await supabase.from('stores').insert({
        name: safe(name), platform: safe(platform), url: safe(url, 500),
        api_key: safe(api_key, 500), status: 'active', orders_count: 0,
        user_id: userId || null,
      }).select().single();
      if (error) throw error;
      await logActivity(supabase, userId, `Store connected: ${name}`, 'stores');
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json(ERRORS.MISSING_FIELDS(['id']));
      const { data, error } = await supabase.from('stores').update({
        name: safe(updates.name), platform: safe(updates.platform),
        url: safe(updates.url, 500), status: safe(updates.status),
      }).eq('id', safe(id)).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json(ERRORS.MISSING_FIELDS(['id']));
      const { error } = await supabase.from('stores').delete().eq('id', safe(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[stores]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('stores'));
  }
}
