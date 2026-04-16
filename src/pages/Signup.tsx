import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Building2,
  CheckCircle, Shield, AlertCircle, Phone,
  RefreshCw, X, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';
import { getDeviceFingerprint, storeFingerprint, setTrialCookie, hasTrialBeenUsed } from '../lib/fingerprint';

// ── Password strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special', ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const barColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? barColors[score - 1] : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {checks.map((c, i) => (
            <span key={i} className={`text-[10px] flex items-center gap-1 ${c.ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              {c.ok ? <CheckCircle className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className={`text-xs font-bold ${barColors[score-1].replace('bg-', 'text-')}`}>{labels[score-1]}</span>}
      </div>
    </div>
  );
}

// ── Math CAPTCHA ──────────────────────────────────────────────────────────────
function MathCaptcha({ onVerified }: { onVerified: (v: boolean) => void }) {
  const [a] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [b] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [ans, setAns] = useState('');
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);

  const check = () => {
    if (parseInt(ans) === a + b) { setOk(true); setErr(false); onVerified(true); }
    else { setErr(true); onVerified(false); setAns(''); }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> Security Check
      </p>
      {ok ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-bold">
          <CheckCircle className="w-4 h-4" /> Verified!
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600">
            {a} + {b} = ?
          </span>
          <input
            type="number"
            value={ans}
            onChange={e => { setAns(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="?"
            className={`w-20 px-3 py-2 bg-white dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 ${err ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
          />
          <button type="button" onClick={check} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
            Check
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-500 mt-1.5">Wrong answer, try again.</p>}
    </div>
  );
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        maxLength={6}
        autoComplete="one-time-code"
        className={`w-full px-4 py-5 bg-gray-900 border rounded-2xl text-white text-center text-3xl font-black tracking-[0.5em] focus:outline-none transition-colors ${
          error ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-indigo-500'
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Signup() {
  const { setUser, platformSettings } = useApp();
  const navigate = useNavigate();
  const platformName = platformSettings?.platform_name || 'DeliverPro';

  const [step, setStep] = useState(1); // 1=form, 2=otp, 3=done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', password: '' });

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);

  // Get device fingerprint on mount
  useEffect(() => {
    getDeviceFingerprint().then(fp => {
      setFingerprint(fp);
      storeFingerprint(fp);
    });
    if (hasTrialBeenUsed()) {
      setWarnings(['A free trial has previously been used from this browser. If you already have an account, please sign in.']);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // OTP countdown timer
  useEffect(() => {
    if (!otpExpiresAt) return;
    const update = () => {
      const left = Math.max(0, Math.floor((otpExpiresAt.getTime() - Date.now()) / 1000));
      setOtpTimeLeft(left);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [otpExpiresAt]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!captchaOk) { setError('Please complete the security check.'); return; }
    sendOTP();
  };

  const sendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          company: form.company.trim(),
          phone: form.phone.trim(),
          fingerprint,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        if (data.code === 'DUPLICATE_EMAIL') {
          // Offer login redirect
        }
        setLoading(false);
        return;
      }

      setRegistrationId(data.registration_id);
      setDemoOtp(data.demo_otp || '');
      setOtpExpiresAt(new Date(Date.now() + (data.expires_in || 300) * 1000));
      setResendTimer(60);
      setStep(2);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setOtpError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    setOtpError('');

    try {
      // Verify OTP
      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_otp', registration_id: registrationId, otp }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setOtpError(verifyData.error || 'Invalid code. Please try again.');
        setLoading(false);
        return;
      }

      // Complete registration
      const completeRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', registration_id: registrationId }),
      });
      const completeData = await completeRes.json();

      if (!completeRes.ok) {
        setOtpError(completeData.error || 'Account creation failed. Please try again.');
        setLoading(false);
        return;
      }

      // Mark trial used on this device
      setTrialCookie(form.email);

      // Store session
      const user = completeData.user;
      if (completeData.session_token) {
        localStorage.setItem('autoflow-session', completeData.session_token);
      }
      setUser(user);
      setStep(3);
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_otp', registration_id: registrationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Could not resend code.');
        return;
      }
      setDemoOtp(data.demo_otp || '');
      setOtpExpiresAt(new Date(Date.now() + (data.expires_in || 300) * 1000));
      setResendTimer(60);
      setOtp('');
    } catch {
      setOtpError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const otpMinutes = Math.floor(otpTimeLeft / 60);
  const otpSeconds = otpTimeLeft % 60;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.8) 0%, transparent 60%)' }} />
        <div className="relative">
          <Link to="/" className="mb-16 block">
            <Logo size="md" variant="full" forceTheme="dark" />
          </Link>
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Start your free<br /><span className="text-indigo-300">10-day trial</span><br />today.
          </h2>
          <p className="text-indigo-200 mb-8 leading-relaxed">No credit card required. Full access to all features during your trial.</p>
          <div className="space-y-3">
            {[
              'All Algerian carriers (Yalidine, ZR Express, Noest...)',
              'International carriers (DHL, FedEx, UPS, Aramex)',
              'Unlimited order imports & automation',
              'Real-time analytics & COD management',
              'Multi-store & multi-warehouse support',
              'Arabic RTL, French & English support',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-indigo-100">
                <CheckCircle className="w-4 h-4 text-indigo-300 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-3 p-4 bg-white/10 backdrop-blur rounded-2xl">
          <Shield className="w-8 h-8 text-indigo-300 flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">Secured & Verified</p>
            <p className="text-indigo-300 text-xs">Email OTP • Device fingerprinting • IP protection</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" variant="full" forceTheme="dark" clickable />
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {['Account Info', 'Verify Email', 'Done'].map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${
                  step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
                }`}>
                  {step > i + 1 ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${step === i + 1 ? 'text-white' : 'text-gray-600'}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-green-500' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>

          {/* Warnings */}
          <AnimatePresence>
            {warnings.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-4 bg-amber-900/30 border border-amber-700/50 rounded-2xl">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{w}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-5 p-4 bg-red-900/30 border border-red-700/50 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-300">{error}</p>
                  {error.toLowerCase().includes('already exists') && (
                    <Link to="/login" className="text-xs text-indigo-400 hover:underline mt-1 inline-block">→ Sign in to your account</Link>
                  )}
                </div>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 flex-shrink-0"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── STEP 1: Registration form ── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-black text-white mb-1">Create your account</h1>
              <p className="text-gray-400 mb-6 text-sm">
                Already have one? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign in</Link>
              </p>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                        placeholder="Your name" autoComplete="name"
                        className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1.5 block">Company</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={form.company} onChange={e => setForm({...form, company: e.target.value})}
                        placeholder="Optional" autoComplete="organization"
                        className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="you@example.com" autoComplete="email"
                      className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block">Phone <span className="text-gray-600">(for SMS OTP)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      placeholder="+213 6XX XXX XXX" autoComplete="tel"
                      className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 mb-1.5 block">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                      placeholder="Min 8 characters" autoComplete="new-password"
                      className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" required />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>

                <MathCaptcha onVerified={setCaptchaOk} />

                <button type="submit" disabled={loading || !captchaOk}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending code...</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-600">
                By signing up, you agree to our{' '}
                <a href="#" className="text-indigo-400 hover:underline">Terms</a> and{' '}
                <a href="#" className="text-indigo-400 hover:underline">Privacy Policy</a>. One free trial per person.
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-2xl font-black text-white mb-2">Verify your email</h1>
              <p className="text-gray-400 mb-2 text-sm">
                We sent a 6-digit code to{' '}
                <span className="text-indigo-400 font-semibold">{form.email.replace(/(.{2}).*(@.*)/, '$1***$2')}</span>
              </p>

              {/* OTP countdown */}
              {otpTimeLeft > 0 && (
                <div className={`flex items-center gap-2 mb-5 text-xs font-semibold ${otpTimeLeft < 60 ? 'text-red-400' : 'text-gray-400'}`}>
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  Code expires in {otpMinutes}:{otpSeconds.toString().padStart(2, '0')}
                </div>
              )}
              {otpTimeLeft === 0 && otpExpiresAt && (
                <div className="flex items-center gap-2 mb-5 text-xs font-semibold text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Code expired — please request a new one
                </div>
              )}

              {/* Demo OTP hint */}
              {demoOtp && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-900/20 border border-amber-700/40 rounded-xl mb-5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-300">Demo Mode</p>
                    <p className="text-xs text-amber-400 mt-0.5">
                      Your code: <span className="font-black text-amber-200 tracking-widest">{demoOtp}</span>
                      <span className="text-amber-600 ml-1">(In production, sent via email)</span>
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <OTPInput value={otp} onChange={setOtp} error={otpError} />

                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Create Account'}
                </button>

                <div className="text-center space-y-2">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-500">Resend code in <span className="text-indigo-400 font-bold">{resendTimer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleResend} disabled={loading}
                      className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors disabled:opacity-50">
                      Didn't receive it? Resend code
                    </button>
                  )}
                  <div>
                    <button type="button" onClick={() => { setStep(1); setOtp(''); setOtpError(''); }}
                      className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" /> Change email
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-3xl font-black text-white mb-3">Welcome to {platformName}! 🎉</h1>
              <p className="text-gray-400 mb-2">Your account is ready. Your 10-day free trial has started.</p>
              <p className="text-sm text-indigo-400 font-semibold">Redirecting to your dashboard...</p>
              <div className="mt-6 flex justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
