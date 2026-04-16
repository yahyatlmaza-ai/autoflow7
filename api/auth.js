import supabase from './_supabase.js';
import {
  getIP, safe, setCORSHeaders, hashPassword, verifyPassword,
  generateSessionToken, generateTenantId, generateUserId,
  generateOTP, hashOTP, checkRateLimit, logAttempt, logActivity,
  ERRORS, TRIAL_DAYS, SESSION_DURATION_DAYS, OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS,
} from './_helpers.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  setCORSHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getIP(req);
  const body = req.body || {};
  const action = safe(body.action);

  // ══════════════════════════════════════════════════════════════════════════
  // POST /api/auth  action=register  — Step 1: initiate registration
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'register') {
    const email    = safe(body.email).toLowerCase();
    // Do NOT run passwords through safe() — it strips valid special characters.
    // Passwords are only ever hashed, never interpolated into HTML or SQL.
    const password = String(body.password || '').slice(0, 100);
    const name     = safe(body.name);
    const company  = safe(body.company);
    const phone    = safe(body.phone);
    const fingerprint = safe(body.fingerprint, 200);

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json(ERRORS.MISSING_FIELDS(['name', 'email', 'password']));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(ERRORS.INVALID_EMAIL);
    }
    if (password.length < 8) {
      return res.status(400).json(ERRORS.WEAK_PASSWORD);
    }

    try {
      // Rate limit: IP — max 5 registration attempts per hour
      const ipRL = await checkRateLimit(supabase, ip, 'register', 60, 5);
      if (!ipRL.allowed) {
        return res.status(429).json(ERRORS.RATE_LIMITED(60));
      }

      // Check duplicate email
      const { data: existingReg } = await supabase
        .from('trial_registrations')
        .select('id, status')
        .eq('email', email)
        .in('status', ['active', 'verified'])
        .maybeSingle();
      if (existingReg) {
        return res.status(409).json(ERRORS.DUPLICATE_EMAIL);
      }

      // Check duplicate device fingerprint
      if (fingerprint) {
        const { data: deviceMatch } = await supabase
          .from('trial_registrations')
          .select('id')
          .eq('device_fingerprint', fingerprint)
          .in('status', ['active', 'verified'])
          .maybeSingle();
        if (deviceMatch) {
          return res.status(409).json(ERRORS.DUPLICATE_DEVICE);
        }
      }

      // Hash password
      const { hash: passwordHash } = hashPassword(password);

      // Generate OTP
      const rawOTP  = generateOTP();
      const otpSalt = crypto.randomBytes(16).toString('hex');
      const otpHash = hashOTP(rawOTP, otpSalt);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // Invalidate previous pending registrations for same email
      await supabase
        .from('trial_registrations')
        .update({ status: 'superseded' })
        .eq('email', email)
        .eq('status', 'pending')
        .catch(() => {});

      // Store registration with hashed password and OTP
      const meta = JSON.stringify({ name, company, phone, passwordHash, otpSalt });
      const { data: reg, error: regErr } = await supabase
        .from('trial_registrations')
        .insert({
          email,
          phone: phone || null,
          ip_address: ip,
          device_fingerprint: fingerprint || null,
          user_agent: safe(req.headers['user-agent'], 500),
          status: 'pending',
          otp_code: otpHash,
          otp_expires_at: otpExpiry,
          otp_verified: false,
          attempt_count: 0,
          blocked_reason: meta,
        })
        .select('id')
        .single();

      if (regErr) throw regErr;

      await logAttempt(supabase, email, 'register', ip, true);
      await logActivity(supabase, email, 'Registration initiated', 'auth', { ip }, ip);

      // In production: send OTP via email/SMS
      console.log(`[auto Flow OTP] Register: ${email} → ${rawOTP}`);

      return res.status(200).json({
        success: true,
        registration_id: reg.id,
        expires_in: OTP_EXPIRY_MINUTES * 60,
        message: `Verification code sent to ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}.`,
        demo_otp: rawOTP, // ⚠️ Remove in production
      });

    } catch (err) {
      console.error('[auth/register]', err?.message);
      return res.status(500).json(ERRORS.SERVER_ERROR('registration'));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // action=verify_otp  — Step 2: verify OTP
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'verify_otp') {
    const registration_id = safe(body.registration_id);
    const otp_input       = safe(body.otp, 10);

    if (!registration_id || !otp_input) {
      return res.status(400).json(ERRORS.MISSING_FIELDS(['registration_id', 'otp']));
    }

    try {
      const { data: reg, error: fetchErr } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('id', registration_id)
        .single();

      if (fetchErr || !reg) {
        return res.status(404).json(ERRORS.SESSION_NOT_FOUND);
      }
      if (reg.status === 'active' || reg.status === 'verified') {
        return res.status(400).json(ERRORS.OTP_USED);
      }
      if (reg.status === 'superseded') {
        return res.status(400).json(ERRORS.SESSION_NOT_FOUND);
      }

      // Max attempts
      if ((reg.attempt_count || 0) >= OTP_MAX_ATTEMPTS) {
        return res.status(429).json(ERRORS.OTP_MAX_ATTEMPTS);
      }

      // Expiry
      if (new Date(reg.otp_expires_at) < new Date()) {
        return res.status(400).json(ERRORS.OTP_EXPIRED);
      }

      // Increment attempts
      await supabase
        .from('trial_registrations')
        .update({ attempt_count: (reg.attempt_count || 0) + 1 })
        .eq('id', registration_id);

      // Parse salt from metadata
      let meta = {};
      try { meta = JSON.parse(reg.blocked_reason || '{}'); } catch {}
      const otpSalt = meta.otpSalt || '';

      // Verify hash
      const inputHash = hashOTP(otp_input.trim(), otpSalt);
      if (inputHash !== reg.otp_code) {
        const remaining = OTP_MAX_ATTEMPTS - (reg.attempt_count || 0) - 1;
        await logAttempt(supabase, reg.email, 'otp_verify', ip, false);
        return res.status(400).json(ERRORS.OTP_INVALID(remaining));
      }

      // ✅ Correct — mark verified
      await supabase
        .from('trial_registrations')
        .update({ otp_verified: true, status: 'verified' })
        .eq('id', registration_id);

      await logAttempt(supabase, reg.email, 'otp_verify', ip, true);

      return res.status(200).json({ success: true, message: 'Email verified successfully.' });

    } catch (err) {
      console.error('[auth/verify_otp]', err?.message);
      return res.status(500).json(ERRORS.SERVER_ERROR('otp-verification'));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // action=complete  — Step 3: create account
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'complete') {
    const registration_id = safe(body.registration_id);

    if (!registration_id) {
      return res.status(400).json(ERRORS.MISSING_FIELDS(['registration_id']));
    }

    try {
      const { data: reg } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('id', registration_id)
        .single();

      if (!reg || reg.status !== 'verified') {
        return res.status(400).json({ error: 'Email verification required before completing registration.', code: 'NOT_VERIFIED' });
      }

      let meta = {};
      try { meta = JSON.parse(reg.blocked_reason || '{}'); } catch {}

      const userId   = generateUserId(reg.email);
      const tenantId = generateTenantId(reg.email);
      const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const sessionToken = generateSessionToken();

      // Create user record
      await supabase.from('users').insert({
        user_id: userId,
        email: reg.email,
        password_hash: meta.passwordHash || '',
        name: meta.name || reg.email.split('@')[0],
        company: meta.company || '',
        phone: meta.phone || reg.phone || '',
        role: 'user',
        plan: 'trial',
        tenant_id: tenantId,
        is_verified: true,
        is_active: true,
      }).catch(() => {});

      // Create user profile
      await supabase.from('user_profiles').insert({
        user_id: userId,
        name: meta.name || reg.email.split('@')[0],
        company: meta.company || '',
        phone: meta.phone || '',
        role: 'admin',
        plan: 'trial',
        trial_end: trialEnd,
        theme: 'dark',
        language: 'en',
        currency: 'DZD',
        auto_forward: false,
        onboarding_complete: false,
        onboarding_step: 0,
      }).catch(() => {});

      // Create trial subscription (no plan shown during onboarding)
      await supabase.from('subscriptions').insert({
        user_email: reg.email,
        plan: 'trial',
        status: 'trial',
        currency: 'DZD',
        amount: 0,
        trial_start: new Date().toISOString(),
        trial_end: trialEnd,
      }).catch(() => {});

      // Create session
      const sessionExpiry = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('sessions').insert({
        session_token: sessionToken,
        user_id: userId,
        email: reg.email,
        ip_address: ip,
        user_agent: safe(req.headers['user-agent'], 500),
        expires_at: sessionExpiry,
        is_valid: true,
      }).catch(() => {});

      // Mark registration as active
      await supabase
        .from('trial_registrations')
        .update({ status: 'active' })
        .eq('id', registration_id);

      await logActivity(supabase, userId, 'Account created', 'auth', { email: reg.email, plan: 'trial' }, ip);

      console.log(`[auto Flow] New account: ${reg.email} (${userId}) trial ends ${trialEnd}`);

      return res.status(201).json({
        success: true,
        session_token: sessionToken,
        user: {
          id: userId,
          email: reg.email,
          name: meta.name || reg.email.split('@')[0],
          company: meta.company || '',
          plan: 'trial',
          trialEnd,
          isDemo: false,
          tenantId,
        },
      });

    } catch (err) {
      console.error('[auth/complete]', err?.message);
      return res.status(500).json(ERRORS.SERVER_ERROR('account-creation'));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // action=resend_otp
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'resend_otp') {
    const registration_id = safe(body.registration_id);
    if (!registration_id) return res.status(400).json(ERRORS.MISSING_FIELDS(['registration_id']));

    try {
      const { data: reg } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('id', registration_id)
        .maybeSingle();

      if (!reg) return res.status(404).json(ERRORS.SESSION_NOT_FOUND);

      // Cooldown check
      const updatedAt = new Date(reg.updated_at || reg.created_at);
      const secsSince = (Date.now() - updatedAt.getTime()) / 1000;
      if (secsSince < OTP_RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          error: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secsSince)} seconds before requesting a new code.`,
          retry_after: Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secsSince),
          code: 'COOLDOWN',
        });
      }

      // Generate new OTP
      const rawOTP  = generateOTP();
      const otpSalt = crypto.randomBytes(16).toString('hex');
      const otpHash = hashOTP(rawOTP, otpSalt);
      const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      // Update salt in meta
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
        expires_in: OTP_EXPIRY_MINUTES * 60,
        message: 'New verification code sent.',
        demo_otp: rawOTP, // ⚠️ Remove in production
      });

    } catch (err) {
      console.error('[auth/resend_otp]', err?.message);
      return res.status(500).json(ERRORS.SERVER_ERROR('resend-otp'));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // action=login
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'login') {
    const email    = safe(body.email).toLowerCase();
    // See note in register: passwords are not sanitized, only length-limited.
    const password = String(body.password || '').slice(0, 100);

    if (!email || !password) {
      return res.status(400).json(ERRORS.MISSING_FIELDS(['email', 'password']));
    }

    try {
      // Rate limit: 10 attempts per 15 min per IP
      const ipRL = await checkRateLimit(supabase, ip, 'login', 15, 10);
      if (!ipRL.allowed) return res.status(429).json(ERRORS.RATE_LIMITED(15));

      // Demo bypass
      if (email === 'demo@autoflow.dz' && password === 'demo123') {
        await logAttempt(supabase, ip, 'login', ip, true);
        return res.status(200).json({
          success: true,
          user: { id: 'demo', email, name: 'Demo User', plan: 'professional', isDemo: true },
        });
      }

      // Find account
      const { data: reg } = await supabase
        .from('trial_registrations')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle();

      if (!reg) {
        await logAttempt(supabase, ip, 'login', ip, false);
        return res.status(401).json(ERRORS.INVALID_CREDENTIALS);
      }

      // Verify password
      let meta = {};
      try { meta = JSON.parse(reg.blocked_reason || '{}'); } catch {}
      const storedHash = meta.passwordHash || '';

      const passwordOk = storedHash
        ? verifyPassword(password, storedHash)
        : password.length >= 6; // fallback for old accounts

      if (!passwordOk) {
        await logAttempt(supabase, ip, 'login', ip, false);
        return res.status(401).json(ERRORS.INVALID_CREDENTIALS);
      }

      // Get profile — must match the ID format used at registration time.
      const userId = generateUserId(email);
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const trialEnd = profile?.trial_end || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

      // Create session
      const sessionToken = generateSessionToken();
      const sessionExpiry = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('sessions').insert({
        session_token: sessionToken,
        user_id: userId,
        email,
        ip_address: ip,
        user_agent: safe(req.headers['user-agent'], 500),
        expires_at: sessionExpiry,
        is_valid: true,
      }).catch(() => {});

      // Update last login
      await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('email', email).catch(() => {});
      await logAttempt(supabase, ip, 'login', ip, true);
      await logActivity(supabase, userId, 'User logged in', 'auth', null, ip);

      return res.status(200).json({
        success: true,
        session_token: sessionToken,
        user: {
          id: userId,
          email: reg.email,
          name: profile?.name || meta.name || email.split('@')[0],
          company: profile?.company || meta.company || '',
          plan: profile?.plan || 'trial',
          trialEnd,
          isDemo: false,
        },
      });

    } catch (err) {
      console.error('[auth/login]', err?.message);
      return res.status(500).json(ERRORS.SERVER_ERROR('login'));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // action=logout
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'logout') {
    const sessionToken = safe(body.session_token || req.headers['authorization']?.replace('Bearer ', ''));
    if (sessionToken) {
      await supabase.from('sessions').update({ is_valid: false }).eq('session_token', sessionToken).catch(() => {});
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // action=forgot_password
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'forgot_password') {
    const email = safe(body.email).toLowerCase();
    if (!email) return res.status(400).json(ERRORS.MISSING_FIELDS(['email']));

    // Always return success to prevent email enumeration
    const { data: reg } = await supabase.from('trial_registrations').select('id').eq('email', email).maybeSingle();
    if (reg) {
      const rawOTP = generateOTP();
      const otpSalt = crypto.randomBytes(16).toString('hex');
      const otpHash = hashOTP(rawOTP, otpSalt);
      // Store reset OTP in otp_sessions
      await supabase.from('otp_sessions').insert({
        session_id: generateSessionToken().slice(0, 64),
        identifier: email,
        email,
        purpose: 'password_reset',
        otp_hash: otpHash,
        otp_salt: otpSalt,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        used: false,
        invalidated: false,
        attempt_count: 0,
        ip_address: ip,
      }).catch(() => {});
      console.log(`[auto Flow OTP] Password reset for ${email}: ${rawOTP}`);
      await logActivity(supabase, email, 'Password reset requested', 'auth', null, ip);
    }

    return res.status(200).json({
      success: true,
      message: 'If this email is registered, a reset link has been sent to your inbox.',
    });
  }

  return res.status(400).json({ error: `Unknown action '${action}'.`, code: 'INVALID_ACTION' });
}
