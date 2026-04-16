import supabase from './_supabase.js';
import crypto from 'crypto';

// ─── Config ────────────────────────────────────────────────────────────────────
const OTP_SECRET = process.env.OTP_SECRET || 'autoflow-otp-secret-2025';
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TRIAL_DAYS = 10;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function generateOTP() {
  const bytes = crypto.randomBytes(6);
  let otp = '';
  for (let i = 0; i < 6; i++) otp += (bytes[i] % 10).toString();
  return otp;
}

function hashOTP(otp, salt) {
  return crypto
    .createHmac('sha256', salt + OTP_SECRET)
    .update(String(otp).trim())
    .digest('hex');
}

function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    '0.0.0.0'
  );
}

function safe(v) {
  if (v == null) return '';
  return String(v).replace(/[<>"'`;]/g, '').replace(/--/g, '').trim().slice(0, 300);
}

// ─── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);
  const body = req.body || {};
  const action = safe(body.action);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — initiate: validate email, send OTP
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'initiate') {
    const email = safe(body.email).toLowerCase();
    const name  = safe(body.name);
    const company = safe(body.company);
    const phone = safe(body.phone);
    const plan  = safe(body.plan) || 'trial';
    const fingerprint = safe(body.fingerprint);

    // Basic validation
    if (!email || !name) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    try {
      // Check if this email already has an ACTIVE trial
      const { data: existing } = await supabase
        .from('trial_registrations')
        .select('id, status')
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          error: 'An account with this email already exists. Please sign in instead.',
          duplicate_email: true,
        });
      }

      // IP rate limit: max 5 attempts per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentAttempts } = await supabase
        .from('trial_registrations')
        .select('id')
        .eq('ip_address', ip)
        .gte('created_at', oneHourAgo);

      if ((recentAttempts?.length || 0) >= 5) {
        return res.status(429).json({
          error: 'Too many registration attempts from your network. Please try again in 1 hour.',
          rate_limited: true,
        });
      }

      // Delete any old pending registrations for this email
      await supabase
        .from('trial_registrations')
        .delete()
        .eq('email', email)
        .in('status', ['pending', 'verified'])
        .catch(() => {});

      // Generate OTP
      const rawOTP = generateOTP();
      const otpSalt = crypto.randomBytes(16).toString('hex');
      const otpHash = hashOTP(rawOTP, otpSalt);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

      // Store registration with OTP hash (never plain text)
      const { data: reg, error: insertErr } = await supabase
        .from('trial_registrations')
        .insert({
          email,
          phone: phone || null,
          ip_address: ip,
          device_fingerprint: fingerprint || '',
          user_agent: (req.headers['user-agent'] || '').slice(0, 300),
          status: 'pending',
          // Store OTP hash + salt in available columns
          otp_code: otpHash,
          otp_expires_at: otpExpiry,
          otp_verified: false,
          attempt_count: 0,
          // Store metadata in blocked_reason temporarily
          blocked_reason: JSON.stringify({ name, company, plan, otpSalt }),
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[register/initiate] insert error:', insertErr.message);
        return res.status(500).json({ error: 'Could not start registration. Please try again.' });
      }

      // In production: send rawOTP via email/SMS
      // await sendEmail(email, rawOTP);
      console.log(`[auto Flow OTP] ${email} → ${rawOTP}`);

      return res.status(200).json({
        success: true,
        registration_id: reg.id,
        expires_in: Math.floor(OTP_EXPIRY_MS / 1000),
        message: `Verification code sent to ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}.`,
        demo_otp: rawOTP, // ⚠️ Remove in production — for demo only
      });

    } catch (err) {
      console.error('[register/initiate] unexpected:', err?.message);
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — verify_otp: check the code
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'verify_otp') {
    const registration_id = safe(body.registration_id);
    const otp_input = safe(body.otp);

    if (!registration_id || !otp_input) {
      return res.status(400).json({ error: 'Registration ID and verification code are required.' });
    }

    try {
      const { data: reg, error: fetchErr } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('id', registration_id)
        .maybeSingle();

      if (fetchErr || !reg) {
        return res.status(404).json({ error: 'Registration not found. Please start again.' });
      }

      if (reg.status === 'active') {
        return res.status(200).json({ success: true, verified: true, already_active: true });
      }

      if (reg.status === 'verified') {
        return res.status(200).json({ success: true, verified: true, message: 'Already verified.' });
      }

      // Check max attempts (5)
      if ((reg.attempt_count || 0) >= 5) {
        return res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new code.',
          max_attempts: true,
        });
      }

      // Check expiry
      if (new Date(reg.otp_expires_at) < new Date()) {
        return res.status(400).json({
          error: 'Verification code has expired. Please request a new one.',
          expired: true,
        });
      }

      // Increment attempt count
      await supabase
        .from('trial_registrations')
        .update({ attempt_count: (reg.attempt_count || 0) + 1 })
        .eq('id', registration_id);

      // Parse salt from metadata
      let otpSalt = '';
      try {
        const meta = JSON.parse(reg.blocked_reason || '{}');
        otpSalt = meta.otpSalt || '';
      } catch {}

      // Verify OTP
      const inputHash = hashOTP(otp_input.trim(), otpSalt);
      if (inputHash !== reg.otp_code) {
        const remaining = Math.max(0, 4 - (reg.attempt_count || 0));
        return res.status(400).json({
          error: `Incorrect code.${remaining > 0 ? ` ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : ''}`,
          attempts_remaining: remaining,
        });
      }

      // ✅ OTP correct — mark verified
      await supabase
        .from('trial_registrations')
        .update({ otp_verified: true, status: 'verified' })
        .eq('id', registration_id);

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Email verified successfully.',
      });

    } catch (err) {
      console.error('[register/verify_otp] unexpected:', err?.message);
      return res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3 — complete: create account
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'complete') {
    const registration_id = safe(body.registration_id);
    const name    = safe(body.name);
    const company = safe(body.company);
    const plan    = safe(body.plan) || 'trial';

    if (!registration_id) {
      return res.status(400).json({ error: 'Registration ID is required.' });
    }

    try {
      const { data: reg, error: fetchErr } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('id', registration_id)
        .maybeSingle();

      if (fetchErr || !reg) {
        return res.status(404).json({ error: 'Registration not found.' });
      }

      // Allow completion if verified or pending (flexible for demo)
      if (!['verified', 'pending', 'active'].includes(reg.status)) {
        return res.status(400).json({ error: 'Please verify your email before completing registration.' });
      }

      // Parse stored metadata
      let meta = { name: '', company: '', plan: 'trial', otpSalt: '' };
      try { meta = { ...meta, ...JSON.parse(reg.blocked_reason || '{}') }; } catch {}

      const finalName = name || meta.name || reg.email.split('@')[0];
      const finalCompany = company || meta.company || '';
      const finalPlan = plan || meta.plan || 'trial';
      const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const userId = 'af_' + crypto.randomBytes(8).toString('hex');

      // Create user profile
      await supabase.from('user_profiles').upsert({
        user_id: userId,
        name: finalName,
        company: finalCompany,
        phone: reg.phone || '',
        plan: 'trial',
        trial_end: trialEnd,
        role: 'admin',
        theme: 'dark',
        language: 'en',
        currency: 'DZD',
        auto_forward: false,
        onboarding_complete: false,
        onboarding_step: 0,
      }, { onConflict: 'user_id' }).catch(e => console.error('[user_profiles]', e?.message));

      // Create subscription
      await supabase.from('subscriptions').insert({
        user_email: reg.email,
        plan: 'trial',
        status: 'trial',
        trial_start: new Date().toISOString(),
        trial_end: trialEnd,
        currency: 'DZD',
        amount: 0,
      }).catch(e => console.error('[subscriptions]', e?.message));

      // Mark registration active
      await supabase
        .from('trial_registrations')
        .update({ status: 'active' })
        .eq('id', registration_id)
        .catch(() => {});

      // Log
      await supabase.from('activity_logs').insert({
        user_id: userId,
        action: 'Account created',
        entity: 'auth',
        ip_address: ip,
      }).catch(() => {});

      console.log(`[auto Flow] Account created: ${reg.email} (${userId})`);

      return res.status(201).json({
        success: true,
        user: {
          id: userId,
          email: reg.email,
          name: finalName,
          company: finalCompany,
          plan: 'trial',
          trialEnd,
          isDemo: false,
        },
      });

    } catch (err) {
      console.error('[register/complete] unexpected:', err?.message);
      return res.status(500).json({ error: 'Account creation failed. Please try again.' });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // resend_otp — generate a fresh OTP for existing registration
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'resend_otp') {
    const registration_id = safe(body.registration_id);
    if (!registration_id) {
      return res.status(400).json({ error: 'Registration ID is required.' });
    }

    try {
      const { data: reg } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('id', registration_id)
        .maybeSingle();

      if (!reg) return res.status(404).json({ error: 'Registration not found.' });

      // Cooldown: 60 seconds between resends
      const secsSince = (Date.now() - new Date(reg.updated_at || reg.created_at).getTime()) / 1000;
      if (secsSince < 60) {
        return res.status(429).json({
          error: `Please wait ${Math.ceil(60 - secsSince)} seconds before requesting a new code.`,
          retry_after: Math.ceil(60 - secsSince),
        });
      }

      // Generate new OTP
      const rawOTP = generateOTP();
      const otpSalt = crypto.randomBytes(16).toString('hex');
      const otpHash = hashOTP(rawOTP, otpSalt);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

      // Update metadata with new salt
      let meta = {};
      try { meta = JSON.parse(reg.blocked_reason || '{}'); } catch {}
      meta.otpSalt = otpSalt;

      await supabase
        .from('trial_registrations')
        .update({
          otp_code: otpHash,
          otp_expires_at: otpExpiry,
          otp_verified: false,
          attempt_count: 0,
          status: 'pending',
          blocked_reason: JSON.stringify(meta),
        })
        .eq('id', registration_id);

      console.log(`[auto Flow OTP Resend] ${reg.email} → ${rawOTP}`);

      return res.status(200).json({
        success: true,
        expires_in: Math.floor(OTP_EXPIRY_MS / 1000),
        message: 'New verification code sent.',
        demo_otp: rawOTP, // ⚠️ Remove in production
      });

    } catch (err) {
      console.error('[register/resend_otp]', err?.message);
      return res.status(500).json({ error: 'Could not resend code. Please try again.' });
    }
  }

  return res.status(400).json({ error: 'Invalid action. Use: initiate, verify_otp, complete, resend_otp' });
}
