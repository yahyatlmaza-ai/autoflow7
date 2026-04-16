import supabase from './_supabase.js';
import { setCORSHeaders, safe, ERRORS } from './_helpers.js';

export default async function handler(req, res) {
  setCORSHeaders(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const userId = req.headers['x-user-id'] || req.query?.user_id;

  try {
    let query = supabase.from('orders').select('*');
    if (userId && userId !== 'demo') {
      query = query.eq('user_id', safe(userId));
    }
    const { data: orders, error } = await query;
    if (error) throw error;

    const statusCounts = {};
    const carrierCounts = {};
    const revenueByDay = {};
    let totalRevenue = 0, totalCOD = 0;

    (orders || []).forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      if (o.carrier) carrierCounts[o.carrier] = (carrierCounts[o.carrier] || 0) + 1;
      const day = o.created_at?.slice(0, 10) || 'unknown';
      revenueByDay[day] = (revenueByDay[day] || 0) + (Number(o.total) || 0);
      totalRevenue += Number(o.total) || 0;
      if (o.payment_method === 'COD') totalCOD += Number(o.total) || 0;
    });

    return res.status(200).json({
      totalOrders: (orders || []).length,
      totalRevenue,
      totalCOD,
      statusCounts,
      revenueChart: Object.entries(revenueByDay).sort().slice(-14).map(([date, revenue]) => ({ date, revenue })),
      statusChart: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      carrierChart: Object.entries(carrierCounts).map(([carrier, count]) => ({ carrier, count })),
    });
  } catch (err) {
    console.error('[analytics]', err?.message);
    return res.status(500).json(ERRORS.SERVER_ERROR('analytics'));
  }
}
