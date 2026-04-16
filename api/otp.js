import supabase from './_supabase.js';
import crypto from 'crypto';

function generateOTP() {
  const bytes = crypto.randomBytes(6);
  let otp = '';
  for (let i = 0; i < 6; i++) otp += (bytes[i] % 10).toString();
  return otp;
}

function hashOTP(otp, salt) {
  const key = salt || process.env.OTP_SECRET || 'octomatic-secret-2025';
  return crypto.createHmac('sha256', key).update(String(otp)).digest('hex');
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '0.0.0.0';
}

function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>"'`;]/g, '').replace(/--/g, '').trim().slice(0, 300);
}

async function checkRateLimit(identifier, purpose) {
  try {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data } = await supabase.from('otp_attempts').select('id').eq('identifier', identifier).eq('purpose', purpose).gte('created_at', since);
    return { allowed: (data?.length || 0) < 5, count: data?.length || 0 };
  } catch { return { allowed: true, count: 0 }; }
}

async function logAttempt(identifier, purpose, ip, success) {
  try {
    await supabase.from('otp_attempts').insert({ identifier, purpose, ip_address: ip, success });
  } catch {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);
  const body = req.body || {};
  const action = sanitize(body.action);
  const email = sanitize(body.email)?.toLowerCase();
  const phone = sanitize(body.phone);
  const purpose = sanitize(body.purpose) || 'registration';
  const otp_input = sanitize(body.otp);
  const session_id = sanitize(body.session_id);
  const platform_name = sanitize(body.platform_name) || 'Octomatic';

  try {
    if (action === 'send') {
      if (!email && !phone) return res.status(400).json({ error: 'Email or phone is required.' });
      const identifier = email || phone;

      const rateCheck = await checkRateLimit(identifier, purpose);
      if (!rateCheck.allowed) {
        return res.status(429).json({ error: 'Too many OTP requests. Please wait 15 minutes.', rate_limited: true });
      }

      const rawOTP = generateOTP();
      const salt = crypto.randomBytes(16).toString('hex');
      const hashedOTP = hashOTP(rawOTP, salt);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const newSessionId = crypto.randomBytes(32).toString('hex');

      await supabase.from('otp_sessions').update({ used: true, invalidated: true }).eq('identifier', identifier).eq('purpose', purpose).eq('used', false);

      const { error: insertErr } = await supabase.from('otp_sessions').insert({
        session_id: newSessionId, identifier,
        email: email || null, phone: phone || null,
        purpose, otp_hash: hashedOTP, otp_salt: salt,
        expires_at: expiresAt, used: false, invalidated: false,
        attempt_count: 0, ip_address: ip,
      });
      if (insertErr) throw insertErr;

      await logAttempt(identifier, purpose, ip, true);
      await supabase.from('activity_logs').insert({ user_id: identifier, action: `OTP sent for ${purpose}`, entity: 'otp', entity_id: newSessionId, ip_address: ip }).catch(() => {});

      const maskedEmail = email ? email.replace(/(.{2}).*(@.*)/, '$1***$2') : '';
      return res.status(200).json({
        success: true, session_id: newSessionId, expires_in: 300,
        message: `Verification code sent to ${maskedEmail || phone?.slice(0, 4) + '****'}.`,
        demo_otp: rawOTP,
      });
    }

    if (action === 'verify') {
      if (!session_id || !otp_input) return res.status(400).json({ error: 'Session ID and code are required.' });

      const { data: session, error: fetchErr } = await supabase.from('otp_sessions').select('*').eq('session_id', session_id).single();
      if (fetchErr || !session) return res.status(404).json({ error: 'Session not found. Request a new code.' });

      const identifier = session.identifier;

      if ((session.attempt_count || 0) >= 5) {
        await supabase.from('otp_sessions').update({ invalidated: true }).eq('session_id', session_id);
        return res.status(429).json({ error: 'Too many failed attempts. Request a new code.', max_attempts: true });
      }
      if (session.used || session.invalidated) return res.status(400).json({ error: 'Code already used or invalidated.', invalid: true });
      if (new Date(session.expires_at) < new Date()) {
        await supabase.from('otp_sessions').update({ invalidated: true }).eq('session_id', session_id);
        return res.status(400).json({ error: 'Code expired. Request a new one.', expired: true });
      }

      await supabase.from('otp_sessions').update({ attempt_count: (session.attempt_count || 0) + 1 }).eq('session_id', session_id);

      const inputHash = hashOTP(otp_input.trim(), session.otp_salt);
      if (inputHash !== session.otp_hash) {
        await logAttempt(identifier, purpose, ip, false);
        const remaining = 5 - (session.attempt_count || 0) - 1;
        return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`, attempts_remaining: remaining });
      }

      await supabase.from('otp_sessions').update({ used: true, verified_at: new Date().toISOString() }).eq('session_id', session_id);
      await logAttempt(identifier, purpose, ip, true);
      await supabase.from('activity_logs').insert({ user_id: identifier, action: `OTP verified for ${purpose}`, entity: 'otp', entity_id: session_id, ip_address: ip }).catch(() => {});

      return res.status(200).json({ success: true, verified: true, purpose: session.purpose, identifier: session.identifier });
    }

    if (action === 'resend') {
      if (!session_id) return res.status(400).json({ error: 'Session ID required.' });
      const { data: session } = await supabase.from('otp_sessions').select('*').eq('session_id', session_id).single();
      if (!session) return res.status(404).json({ error: 'Session not found.' });

      const secondsSince = (Date.now() - new Date(session.created_at || 0).getTime()) / 1000;
      if (secondsSince < 60) {
        return res.status(429).json({ error: `Wait ${Math.ceil(60 - secondsSince)}s before resending.`, retry_after: Math.ceil(60 - secondsSince) });
      }

      req.body = { action: 'send', email: session.email, phone: session.phone, purpose: session.purpose, platform_name };
      return handler(req, res);
    }

    if (action === 'status') {
      if (!session_id) return res.status(400).json({ error: 'Session ID required.' });
      const { data: session } = await supabase.from('otp_sessions').select('expires_at,used,invalidated,attempt_count,purpose').eq('session_id', session_id).single();
      if (!session) return res.status(404).json({ error: 'Session not found.' });
      const expiresAt = new Date(session.expires_at);
      const secondsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      return res.status(200).json({ valid: !session.used && !session.invalidated && expiresAt > new Date(), used: session.used, invalidated: session.invalidated, expires_in: secondsLeft, attempts_used: session.attempt_count || 0, purpose: session.purpose });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  } catch (err) {
    console.error('[OTP API]', err);
    res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
