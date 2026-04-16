/**
 * Session management — stores JWT token and user data securely.
 * Provides helpers for authenticated API calls with user isolation.
 */

const TOKEN_KEY = 'af_session_token';
const USER_KEY = 'af_user';

export function saveSession(token: string, user: any) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Also clear old keys
    localStorage.removeItem('octomatic-user');
  } catch {}
}

export function isTrialActive(user: any): boolean {
  if (!user) return false;
  if (user.isDemo) return true;
  if (!user.trialEnd) return false;
  return new Date(user.trialEnd) > new Date();
}

export function getTrialDaysLeft(user: any): number {
  if (!user?.trialEnd) return 0;
  const diff = new Date(user.trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Build headers for authenticated API calls.
 * Includes user_id for multi-tenant data isolation.
 */
export function authHeaders(userId?: string): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (userId && userId !== 'demo') headers['X-User-Id'] = userId;
  return headers;
}

/**
 * Authenticated fetch wrapper with automatic user isolation.
 */
export async function apiFetch(url: string, options: RequestInit = {}, userId?: string): Promise<Response> {
  const headers = {
    ...authHeaders(userId),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}
