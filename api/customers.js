import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const userId = safe(req.headers['x-user-id'] || req.query?.user_id);

  try {
    if (req.method === 'GET') {
      let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (userId && userId !== 'demo') query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { name, phone, email, wilaya } = req.body || {};
      if (!name) return res.status(400).json(ERRORS.MISSING_FIELDS(['name']));
      const { data, error } = await supabase.from('customers').insert({
        name: safe(name), phone: safe(phone), email: safe(email),
        wilaya: safe(wilaya), user_id: userId || null,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json(ERRORS.MISSING_FIELDS(['id']));
      const { data, error } = await supabase.from('customers').update(updates).eq('id', safe(id)).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[customers]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('customers'));
  }
}
