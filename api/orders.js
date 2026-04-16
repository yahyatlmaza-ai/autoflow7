import supabase from './_supabase.js';
import { setCORSHeaders, safe, getIP, logActivity, ERRORS } from './_helpers.js';

function getTenantFilter(req) {
  const userId = req.headers['x-user-id'] || req.query?.user_id;
  return userId && userId !== 'null' ? userId : null;
}

export default async function handler(req, res) {
  setCORSHeaders(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const userId = getTenantFilter(req);

  try {
    if (req.method === 'GET') {
      const { status, limit = 50, offset = 0 } = req.query;

      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      // Multi-tenant isolation: filter by user if not demo/admin
      if (userId && userId !== 'demo') {
        query = query.eq('user_id', userId);
      }

      if (status && status !== 'all') {
        query = query.eq('status', safe(status));
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const payload = {
        order_number: safe(body.order_number),
        customer_name: safe(body.customer_name),
        customer_phone: safe(body.customer_phone),
        wilaya: safe(body.wilaya),
        address: safe(body.address),
        carrier: safe(body.carrier),
        status: safe(body.status) || 'pending',
        payment_method: safe(body.payment_method) || 'COD',
        total: Number(body.total) || 0,
        notes: safe(body.notes),
        user_id: userId || null,
      };

      if (!payload.customer_name || !payload.order_number) {
        return res.status(400).json(ERRORS.MISSING_FIELDS(['customer_name', 'order_number']));
      }

      const { data, error } = await supabase.from('orders').insert(payload).select().single();
      if (error) throw error;

      await logActivity(supabase, userId, `Order created: ${payload.order_number}`, 'orders');
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json(ERRORS.MISSING_FIELDS(['id']));

      const safeUpdates = {};
      const allowed = ['status', 'carrier', 'tracking_number', 'notes', 'total', 'payment_method', 'customer_name', 'customer_phone', 'wilaya', 'address'];
      allowed.forEach(k => { if (updates[k] !== undefined) safeUpdates[k] = typeof updates[k] === 'number' ? updates[k] : safe(String(updates[k])); });

      let query = supabase.from('orders').update(safeUpdates).eq('id', safe(id));
      if (userId && userId !== 'demo') query = query.eq('user_id', userId);

      const { data, error } = await query.select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json(ERRORS.MISSING_FIELDS(['id']));

      let query = supabase.from('orders').delete().eq('id', safe(id));
      if (userId && userId !== 'demo') query = query.eq('user_id', userId);

      const { error } = await query;
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[orders]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('orders'));
  }
}
