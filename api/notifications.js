import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const userId = safe(req.query?.user_id || req.body?.user_id || req.headers['x-user-id']);

  try {
    if (req.method === 'GET') {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      const { id, user_id: bodyUserId, mark_all } = req.body || {};
      const targetUserId = safe(bodyUserId || userId);

      if (mark_all && targetUserId) {
        const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', targetUserId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }
      if (id) {
        const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', safe(id)).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      return res.status(400).json(ERRORS.MISSING_FIELDS(['id or mark_all']));
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json(ERRORS.MISSING_FIELDS(['id']));
      const { error } = await supabase.from('notifications').delete().eq('id', safe(id));
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[notifications]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('notifications'));
  }
}
