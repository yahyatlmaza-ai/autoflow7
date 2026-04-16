/**
 * OTP client-side utilities.
 * All actual OTP generation/hashing happens server-side in /api/otp.js
 */

export type OTPPurpose = 'registration' | 'login' | '2fa' | 'password_reset';

export interface OTPSession {
  session_id: string;
  expires_in: number;
  method: 'email' | 'sms';
  message: string;
  demo_otp?: string; // Remove in production
}

export interface OTPVerifyResult {
  success: boolean;
  verified: boolean;
  purpose?: string;
  identifier?: string;
  error?: string;
}

export interface OTPState {
  sessionId: string;
  expiresAt: Date;
  purpose: OTPPurpose;
  demoOtp?: string;
  resendCooldown: number; // seconds remaining
  attemptsRemaining: number;
}

/** Send OTP to email or phone */
export async function sendOTP(params: {
  email?: string;
  phone?: string;
  purpose: OTPPurpose;
  platformName?: string;
}): Promise<{ ok: boolean; session?: OTPSession; error?: string }> {
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', ...params }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send OTP.' };
    return { ok: true, session: data };
  } catch {
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

/** Verify OTP code */
export async function verifyOTP(params: {
  session_id: string;
  otp: string;
  purpose?: OTPPurpose;
}): Promise<{ ok: boolean; result?: OTPVerifyResult; error?: string; expired?: boolean; maxAttempts?: boolean; attemptsRemaining?: number }> {
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', ...params }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data.error,
        expired: data.expired,
        maxAttempts: data.max_attempts,
        attemptsRemaining: data.attempts_remaining,
      };
    }
    return { ok: true, result: data };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

/** Resend OTP using existing session */
export async function resendOTP(params: {
  session_id: string;
  platformName?: string;
}): Promise<{ ok: boolean; session?: OTPSession; error?: string; retryAfter?: number }> {
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend', ...params }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error, retryAfter: data.retry_after };
    return { ok: true, session: data };
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}

/** Check OTP session status */
export async function checkOTPStatus(session_id: string): Promise<{
  valid: boolean; used: boolean; invalidated: boolean;
  expires_in: number; attempts_used: number; purpose: string;
} | null> {
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', session_id }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

/** Format seconds as MM:SS countdown */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Mask email for display */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.length <= 2 ? local : local.slice(0, 2) + '*'.repeat(Math.min(local.length - 2, 4));
  return `${masked}@${domain}`;
}

/** Mask phone for display */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, 4) + '*'.repeat(Math.min(phone.length - 4, 4)) + phone.slice(-2);
}
