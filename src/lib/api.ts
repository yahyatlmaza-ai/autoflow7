/**
 * API client for the auto Flow FastAPI backend.
 *
 * Reads the base URL from VITE_API_URL at build time.  All helpers throw a
 * typed `ApiError` so callers can branch on `err.code` (see errorsI18n.ts for
 * humanized EN/FR/AR messages).
 */

const DEFAULT_API_URL = 'https://app-evicbhkk.fly.dev';

export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_URL
).replace(/\/+$/, '');

const TOKEN_KEY = 'autoflow-token';

export class ApiError extends Error {
  code: string;
  fields: Record<string, string>;
  status: number;

  constructor(code: string, message: string, fields: Record<string, string>, status: number) {
    super(message);
    this.code = code;
    this.fields = fields || {};
    this.status = status;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* no-op */
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  raw?: boolean;
};

export async function api<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal, raw = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData
        ? body
        : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError('NETWORK_ERROR', msg, {}, 0);
  }

  if (raw) return response as unknown as T;

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const err = (payload as { error: { code?: string; message?: string; fields?: Record<string, string> } }).error;
      throw new ApiError(
        err.code || `HTTP_${response.status}`,
        err.message || `HTTP ${response.status}`,
        err.fields || {},
        response.status,
      );
    }
    throw new ApiError(`HTTP_${response.status}`, `HTTP ${response.status}`, {}, response.status);
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Typed DTOs — mirror the FastAPI response shapes.
// ---------------------------------------------------------------------------

export interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'owner' | 'admin' | 'staff';
  tenant_id: number;
  email_verified: boolean;
}

export interface ApiTenant {
  id: number;
  name: string;
  slug: string;
  plan: 'trial' | 'starter' | 'professional' | 'vip' | 'expired';
  trial_end: string | null;
  subscription_end: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'bearer';
  user: ApiUser;
  tenant: ApiTenant;
}

export interface ApiCustomer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiAgent {
  id: number;
  name: string;
  phone: string;
  zone: string;
  active: boolean;
  delivered_count: number;
  failed_count: number;
  on_time_rate: number;
  assigned_open: number;
  created_at: string | null;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface ApiOrder {
  id: number;
  reference: string;
  status: OrderStatus;
  product_name: string;
  quantity: number;
  price: number;
  currency: string;
  customer_id: number | null;
  customer: { id: number; name: string; phone: string } | null;
  agent_id: number | null;
  agent: { id: number; name: string; zone: string } | null;
  shipping_address: string;
  shipping_city: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiNotification {
  id: number;
  kind: 'order_created' | 'order_status' | 'trial_expiring' | 'trial_expired' | 'generic';
  title: string;
  body: string;
  related_order_id: number | null;
  read: boolean;
  created_at: string | null;
}

export interface ApiSubscriptionStatus {
  plan: 'trial' | 'starter' | 'professional' | 'vip' | 'expired';
  active: boolean;
  source: 'trial' | 'starter' | 'professional' | 'vip';
  expires_at: string | null;
  days_left: number;
  plans: Record<string, { price_dzd: number; duration_days: number; orders: number }>;
}

export interface ApiDashboardStats {
  totals: {
    orders: number;
    customers: number;
    agents: number;
    revenue: number;
    revenue_delivered: number;
  };
  by_status: Record<OrderStatus, number>;
  rates?: {
    conversion_rate: number;
    fulfilment_rate: number;
  };
  daily_30d: Array<{ date: string; orders: number; delivered: number; revenue: number }>;
  top_agents: Array<{ id: number; name: string; zone: string; delivered: number; total: number }>;
}

// ---------------------------------------------------------------------------
// Convenience wrappers grouped by resource — pages import from here.
// ---------------------------------------------------------------------------

export const authApi = {
  signup: (body: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    phone?: string;
  }) => api<AuthResponse>('/auth/signup', { method: 'POST', body, auth: false }),
  login: (body: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body, auth: false }),
  me: () => api<AuthResponse>('/auth/me'),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api<void>('/auth/change-password', { method: 'POST', body }),
};

export const customersApi = {
  list: (q = '') => api<ApiCustomer[]>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (body: Partial<ApiCustomer>) => api<ApiCustomer>('/customers', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiCustomer>) =>
    api<ApiCustomer>(`/customers/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/customers/${id}`, { method: 'DELETE' }),
};

export const agentsApi = {
  list: () => api<ApiAgent[]>('/agents'),
  create: (body: Partial<ApiAgent>) => api<ApiAgent>('/agents', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiAgent>) =>
    api<ApiAgent>(`/agents/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/agents/${id}`, { method: 'DELETE' }),
  performance: (id: number) => api<Record<string, unknown>>(`/agents/${id}/performance`),
};

export interface OrderCreate {
  product_name: string;
  quantity?: number;
  price?: number;
  currency?: string;
  customer_id?: number | null;
  agent_id?: number | null;
  shipping_address?: string;
  shipping_city?: string;
  notes?: string;
  reference?: string;
}

export const ordersApi = {
  list: (params: { status?: string; q?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.q) q.set('q', params.q);
    const qs = q.toString();
    return api<ApiOrder[]>(`/orders${qs ? `?${qs}` : ''}`);
  },
  create: (body: OrderCreate) => api<ApiOrder>('/orders', { method: 'POST', body }),
  update: (id: number, body: Partial<OrderCreate>) =>
    api<ApiOrder>(`/orders/${id}`, { method: 'PUT', body }),
  status: (id: number, status: OrderStatus, note = '') =>
    api<ApiOrder>(`/orders/${id}/status`, { method: 'POST', body: { status, note } }),
  history: (id: number) =>
    api<Array<{ id: number; from_status: string | null; to_status: string; note: string; created_at: string | null }>>(
      `/orders/${id}/history`,
    ),
  remove: (id: number) => api<void>(`/orders/${id}`, { method: 'DELETE' }),
  bulkConfirm: (ids: number[]) =>
    api<{ updated: number; errors: Array<{ id: number; code: string }> }>(
      '/orders/bulk/confirm', { method: 'POST', body: { ids } },
    ),
  bulkCancel: (ids: number[]) =>
    api<{ updated: number; errors: Array<{ id: number; code: string }> }>(
      '/orders/bulk/cancel', { method: 'POST', body: { ids } },
    ),
  exportCsvUrl: () => `${API_URL}/orders/export.csv`,
};

export const notificationsApi = {
  list: () => api<{ items: ApiNotification[]; unread: number }>('/notifications'),
  markRead: (ids: number[], all = false) =>
    api<void>('/notifications/mark-read', { method: 'POST', body: { ids, all } }),
};

export const subscriptionsApi = {
  status: () => api<ApiSubscriptionStatus>('/subscriptions/status'),
  upgrade: (plan: 'starter' | 'professional' | 'vip') =>
    api<ApiSubscriptionStatus>('/subscriptions/upgrade', { method: 'POST', body: { plan } }),
};

export const dashboardApi = {
  stats: () => api<ApiDashboardStats>('/dashboard/stats'),
};

// ---------------------------------------------------------------------------
// Octomatic-style resources: stores, carriers+rates, products, shipments,
// returns, team+confirmations, settings, webhooks.
// ---------------------------------------------------------------------------

export interface ApiStore {
  id: number;
  name: string;
  platform: string;
  url: string;
  api_key_preview: string;
  api_secret_set: boolean;
  active: boolean;
  orders_imported: number;
  last_sync_at: string | null;
  created_at: string | null;
}

export interface ApiCarrier {
  id: number;
  name: string;
  provider: string;
  api_id_preview: string;
  api_token_set: boolean;
  active: boolean;
  supports_cod: boolean;
  supports_desk: boolean;
  supports_home: boolean;
  created_at: string | null;
}

export interface ApiDeliveryRate {
  id: number;
  carrier_id: number;
  wilaya: string;
  home_price: number;
  desk_price: number;
  product_id: number | null;
}

export interface ApiProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  active: boolean;
  image_url: string;
  created_at: string | null;
}

export interface ApiShipment {
  id: number;
  order_id: number;
  carrier_id: number | null;
  carrier_name: string | null;
  tracking_number: string;
  label_url: string;
  status: 'pending' | 'printed' | 'in_transit' | 'delivered' | 'failed';
  delivery_type: 'home' | 'desk';
  cost: number;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiReturn {
  id: number;
  order_id: number;
  reason: string;
  status: 'requested' | 'received' | 'restocked' | 'refunded' | 'rejected';
  notes: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiTeamMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  pay_per_confirmed: number;
  active: boolean;
  confirmed_count: number;
  payout_due: number;
  created_at: string | null;
}

export interface ApiConfirmationAttempt {
  id: number;
  order_id: number;
  team_member_id: number | null;
  result: 'no_answer' | 'confirmed' | 'rejected' | 'callback' | 'wrong_number';
  note: string;
  created_at: string | null;
}

export interface ApiTenantSettings {
  tenant_id: number;
  company_name: string;
  company_address: string;
  company_phone: string;
  logo_url: string;
  default_currency: string;
  whatsapp_number: string;
  sms_sender_id: string;
  auto_confirm_enabled: boolean;
  auto_assign_enabled: boolean;
  customer_sms_template: string;
  fraud_return_threshold: number;
  updated_at: string | null;
}

export interface ApiWebhook {
  id: number;
  event: string;
  url: string;
  secret_set: boolean;
  active: boolean;
  created_at: string | null;
  secret?: string;
}

export const storesApi = {
  platforms: () => api<{ platforms: string[] }>('/stores/platforms'),
  list: () => api<ApiStore[]>('/stores'),
  create: (body: Partial<ApiStore> & { api_key?: string; api_secret?: string }) =>
    api<ApiStore>('/stores', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiStore> & { api_key?: string; api_secret?: string }) =>
    api<ApiStore>(`/stores/${id}`, { method: 'PUT', body }),
  sync: (id: number) => api<{ ok: boolean; store: ApiStore }>(`/stores/${id}/sync`, { method: 'POST' }),
  remove: (id: number) => api<void>(`/stores/${id}`, { method: 'DELETE' }),
};

export const carriersApi = {
  providers: () => api<{ providers: string[]; wilayas: string[] }>('/carriers/providers'),
  list: () => api<ApiCarrier[]>('/carriers'),
  create: (body: Partial<ApiCarrier> & { api_id?: string; api_token?: string }) =>
    api<ApiCarrier>('/carriers', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiCarrier> & { api_id?: string; api_token?: string }) =>
    api<ApiCarrier>(`/carriers/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/carriers/${id}`, { method: 'DELETE' }),
  rates: (carrier_id: number) => api<ApiDeliveryRate[]>(`/carriers/${carrier_id}/rates`),
  createRate: (
    carrier_id: number,
    body: { wilaya: string; home_price: number; desk_price: number; product_id?: number | null },
  ) =>
    api<ApiDeliveryRate>(`/carriers/${carrier_id}/rates`, {
      method: 'POST',
      body: { ...body, carrier_id },
    }),
  removeRate: (rate_id: number) => api<void>(`/carriers/rates/${rate_id}`, { method: 'DELETE' }),
};

export const productsApi = {
  list: (q = '') => api<ApiProduct[]>(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (body: Partial<ApiProduct>) => api<ApiProduct>('/products', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiProduct>) =>
    api<ApiProduct>(`/products/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/products/${id}`, { method: 'DELETE' }),
};

export const shipmentsApi = {
  list: (status_filter?: string) =>
    api<ApiShipment[]>(`/shipments${status_filter ? `?status_filter=${status_filter}` : ''}`),
  create: (body: {
    order_id: number;
    carrier_id?: number | null;
    delivery_type?: 'home' | 'desk';
    cost?: number;
    notes?: string;
  }) => api<ApiShipment>('/shipments', { method: 'POST', body }),
  setStatus: (id: number, status: ApiShipment['status']) =>
    api<ApiShipment>(`/shipments/${id}/status`, { method: 'POST', body: { status } }),
  printLabel: (id: number) => api<ApiShipment>(`/shipments/${id}/label`, { method: 'POST' }),
  remove: (id: number) => api<void>(`/shipments/${id}`, { method: 'DELETE' }),
};

export const returnsApi = {
  list: () => api<ApiReturn[]>('/returns'),
  stats: () =>
    api<{ total: number; by_status: Record<string, number>; return_rate: number }>(
      '/returns/stats',
    ),
  create: (body: {
    order_id: number;
    reason?: string;
    status?: ApiReturn['status'];
    notes?: string;
  }) => api<ApiReturn>('/returns', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiReturn>) =>
    api<ApiReturn>(`/returns/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/returns/${id}`, { method: 'DELETE' }),
};

export const teamApi = {
  list: () => api<ApiTeamMember[]>('/team'),
  create: (body: Partial<ApiTeamMember>) => api<ApiTeamMember>('/team', { method: 'POST', body }),
  update: (id: number, body: Partial<ApiTeamMember>) =>
    api<ApiTeamMember>(`/team/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/team/${id}`, { method: 'DELETE' }),
  confirmations: (order_id?: number) =>
    api<ApiConfirmationAttempt[]>(
      `/team/confirmations${order_id ? `?order_id=${order_id}` : ''}`,
    ),
  recordConfirmation: (body: {
    order_id: number;
    team_member_id?: number | null;
    result: ApiConfirmationAttempt['result'];
    note?: string;
  }) => api<ApiConfirmationAttempt>('/team/confirmations', { method: 'POST', body }),
};

export const settingsApi = {
  get: () => api<ApiTenantSettings>('/settings'),
  update: (body: Partial<ApiTenantSettings>) =>
    api<ApiTenantSettings>('/settings', { method: 'PUT', body }),
};

export const webhooksApi = {
  events: () => api<{ events: string[] }>('/webhooks/events'),
  list: () => api<ApiWebhook[]>('/webhooks'),
  create: (body: { event: string; url: string; active?: boolean }) =>
    api<ApiWebhook>('/webhooks', { method: 'POST', body }),
  remove: (id: number) => api<void>(`/webhooks/${id}`, { method: 'DELETE' }),
};
