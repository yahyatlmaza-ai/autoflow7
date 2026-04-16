import supabase from './_supabase.js';

// Demo API - returns data but BLOCKS all mutations
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Demo-Mode');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Only allow GET in demo mode
  if (req.method !== 'GET') {
    return res.status(403).json({
      error: 'Demo mode is read-only. Sign up for a free trial to access full functionality.',
      demo_blocked: true,
    });
  }

  try {
    const { resource } = req.query;

    if (resource === 'orders') {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
      return res.status(200).json(data || []);
    }
    if (resource === 'analytics') {
      const { data: orders } = await supabase.from('orders').select('*');
      const statusCounts = {};
      const carrierCounts = {};
      const revenueByDay = {};
      let totalRevenue = 0, totalCOD = 0;
      (orders || []).forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        carrierCounts[o.carrier] = (carrierCounts[o.carrier] || 0) + 1;
        const day = o.created_at?.slice(0, 10) || 'unknown';
        revenueByDay[day] = (revenueByDay[day] || 0) + (o.total || 0);
        totalRevenue += o.total || 0;
        if (o.payment_method === 'COD') totalCOD += o.total || 0;
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
    }
    if (resource === 'stores') {
      const { data } = await supabase.from('stores').select('*').limit(10);
      return res.status(200).json(data || []);
    }
    if (resource === 'customers') {
      const { data } = await supabase.from('customers').select('*').limit(10);
      return res.status(200).json(data || []);
    }

    return res.status(404).json({ error: 'Resource not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
