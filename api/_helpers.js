import crypto from 'crypto';

// ── Platform constants ────────────────────────────────────────────────────────
export const PLATFORM_NAME = 'DeliverPro';
// NOTE: The default OTP_SECRET string is kept as-is so that OTP hashes produced
// by the previous platform name remain verifiable. Override via env in prod.
export const OTP_SECRET = process.env.OTP_SECRET || 'autoflow-otp-secret-key-2025-secure';
export const SESSION_DURATION_DAYS = 30;
export const TRIAL_DAYS = 10;
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

// ── Security ──────────────────────────────────────────────────────────────────
export function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    '0.0.0.0'
  );
}

export function safe(v, maxLen = 300) {
  if (v == null) return '';
  return String(v)
    .replace(/[<>"'`;]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .trim()
    .slice(0, maxLen);
}

export function setCORSHeaders(res, methods = 'GET, POST, PUT, DELETE, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Tenant-Id');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

// ── OTP ───────────────────────────────────────────────────────────────────────
export function generateOTP(length = 6) {
  const bytes = crypto.randomBytes(length);
  let otp = '';
  for (let i = 0; i < length; i++) otp += (bytes[i] % 10).toString();
  return otp;
}

export function hashOTP(otp, salt) {
  return crypto
    .createHmac('sha256', (salt || '') + OTP_SECRET)
    .update(String(otp).trim())
    .digest('hex');
}

export function generateSessionToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function generateTenantId(email) {
  return 'tenant_' + crypto
    .createHash('sha256')
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

export function generateUserId(email) {
  // Deterministic by email so register and login always produce the same userId.
  return 'af_' + crypto
    .createHash('sha256')
    .update(String(email || '').toLowerCase().trim())
    .digest('hex')
    .slice(0, 20);
}

// ── Admin auth check (shared between admin.js and settings.js) ────────────────
export async function isAdminUser(supabase, req) {
  const userId = req.headers['x-user-id'];
  if (!userId || userId === 'demo') return false;
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.role === 'admin' || data?.role === 'super_admin';
}

// Simple password hashing (SHA-256 + salt; use bcrypt in production)
export function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', s + OTP_SECRET).update(password).digest('hex');
  return { hash: `${s}:${hash}`, salt: s };
}

export function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':');
    const { hash: computed } = hashPassword(password, salt);
    const computedParts = computed.split(':');
    return crypto.timingSafeEqual(
      Buffer.from(hash || ''),
      Buffer.from(computedParts[1] || '')
    );
  } catch { return false; }
}

// ── Rate limiting (via otp_attempts table) ────────────────────────────────────
export async function checkRateLimit(supabase, identifier, purpose, windowMinutes = 15, maxAttempts = 10) {
  try {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('otp_attempts')
      .select('id')
      .eq('identifier', identifier)
      .eq('purpose', purpose)
      .gte('created_at', since);
    const count = data?.length || 0;
    return { allowed: count < maxAttempts, count, remaining: Math.max(0, maxAttempts - count) };
  } catch { return { allowed: true, count: 0, remaining: maxAttempts }; }
}

export async function logAttempt(supabase, identifier, purpose, ip, success) {
  await supabase.from('otp_attempts').insert({
    identifier, purpose, ip_address: ip, success,
  }).catch(() => {});
}

export async function logActivity(supabase, userId, action, entity = 'system', details = null, ip = null) {
  await supabase.from('activity_logs').insert({
    user_id: userId, action, entity,
    details: details ? JSON.stringify(details) : null,
    ip_address: ip,
  }).catch(() => {});
}

// ── Error responses ───────────────────────────────────────────────────────────
export const ERRORS = {
  MISSING_FIELDS: (fields) => ({ error: `Required fields missing: ${fields.join(', ')}.`, code: 'MISSING_FIELDS' }),
  INVALID_EMAIL: { error: 'Please enter a valid email address.', code: 'INVALID_EMAIL' },
  WEAK_PASSWORD: { error: 'Password must be at least 8 characters with uppercase, number, and special character.', code: 'WEAK_PASSWORD' },
  DUPLICATE_EMAIL: { error: 'An account with this email already exists. Please sign in instead.', code: 'DUPLICATE_EMAIL' },
  DUPLICATE_DEVICE: { error: 'A free trial has already been used from this device. Please sign in to your existing account.', code: 'DUPLICATE_DEVICE' },
  RATE_LIMITED: (mins = 15) => ({ error: `Too many attempts. Please wait ${mins} minutes before trying again.`, code: 'RATE_LIMITED', retry_after_minutes: mins }),
  IP_BLOCKED: { error: 'Too many requests from your network. Please try again later.', code: 'IP_BLOCKED' },
  INVALID_CREDENTIALS: { error: 'Incorrect email or password. Please check your details and try again.', code: 'INVALID_CREDENTIALS' },
  ACCOUNT_NOT_VERIFIED: { error: 'Your account email is not verified. Please check your inbox for the verification code.', code: 'NOT_VERIFIED' },
  ACCOUNT_INACTIVE: { error: 'Your account has been suspended. Please contact support.', code: 'ACCOUNT_INACTIVE' },
  OTP_INVALID: (remaining) => ({ error: `Incorrect verification code.${remaining > 0 ? ` ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : ' No attempts remaining — please request a new code.'}`, code: 'OTP_INVALID', attempts_remaining: remaining }),
  OTP_EXPIRED: { error: 'Verification code has expired. Please request a new one.', code: 'OTP_EXPIRED' },
  OTP_USED: { error: 'This code has already been used. Please request a new verification code.', code: 'OTP_USED' },
  OTP_MAX_ATTEMPTS: { error: 'Too many incorrect attempts. Please request a new verification code.', code: 'OTP_MAX_ATTEMPTS' },
  SESSION_NOT_FOUND: { error: 'Verification session not found or expired. Please start again.', code: 'SESSION_NOT_FOUND' },
  SERVER_ERROR: (context) => ({ error: `Something went wrong${context ? ` (${context})` : ''}. Please try again or contact support if the issue persists.`, code: 'SERVER_ERROR' }),
  NOT_FOUND: (entity) => ({ error: `${entity || 'Resource'} not found.`, code: 'NOT_FOUND' }),
  FORBIDDEN: { error: 'You do not have permission to perform this action.', code: 'FORBIDDEN' },
  TRIAL_EXPIRED: { error: 'Your free trial has expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' },
  SUBSCRIPTION_REQUIRED: { error: 'An active subscription is required to access this feature.', code: 'SUBSCRIPTION_REQUIRED' },
};
