import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, CheckCircle, AlertCircle, Clock, Mail, Phone } from 'lucide-react';
import { sendOTP, verifyOTP, resendOTP, formatCountdown, maskEmail, maskPhone, type OTPPurpose } from '../lib/otp';
import { useApp } from '../context/AppContext';

interface OTPInputProps {
  email?: string;
  phone?: string;
  purpose: OTPPurpose;
  onVerified: (sessionId: string) => void;
  onBack?: () => void;
  autoSend?: boolean;
}

const PURPOSE_LABELS: Record<OTPPurpose, { title: string; subtitle: string; icon: any }> = {
  registration:    { title: 'Verify Your Email',    subtitle: 'Enter the 6-digit code we sent you',   icon: Mail },
  login:           { title: 'Login Verification',   subtitle: 'Enter your one-time login code',        icon: Shield },
  '2fa':           { title: 'Two-Factor Auth',      subtitle: 'Enter your authenticator code',         icon: Shield },
  password_reset:  { title: 'Reset Your Password',  subtitle: 'Enter the code to reset your password', icon: Shield },
};

export default function OTPInput({ email, phone, purpose, onVerified, onBack, autoSend = true }: OTPInputProps) {
  const { platformSettings } = useApp();
  const platformName = platformSettings?.platform_name || 'DeliverPro';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [sessionId, setSessionId] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);       // OTP expiry countdown (5 min)
  const [resendCooldown, setResendCooldown] = useState(0); // Resend cooldown (60s)
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const identifier = email || phone || '';
  const maskedIdentifier = email ? maskEmail(email) : phone ? maskPhone(phone) : '';
  const meta = PURPOSE_LABELS[purpose] || PURPOSE_LABELS.registration;
  const Icon = meta.icon;

  // Auto-send on mount
  useEffect(() => {
    if (autoSend && identifier) handleSend();
  }, []);

  // Countdown timers
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSend = useCallback(async () => {
    setSending(true);
    setError('');
    const result = await sendOTP({ email, phone, purpose, platformName });
    setSending(false);
    if (!result.ok) { setError(result.error || 'Failed to send code.'); return; }
    setSessionId(result.session?.session_id || '');
    setDemoOtp(result.session?.demo_otp || '');
    setSent(true);
    setCountdown(300); // 5 min
    setResendCooldown(60);
    setDigits(['', '', '', '', '', '']);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [email, phone, purpose, platformName]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setSending(true);
    setError('');
    setSuccess('');
    const result = sessionId
      ? await resendOTP({ session_id: sessionId, platformName })
      : await sendOTP({ email, phone, purpose, platformName });
    setSending(false);
    if (!result.ok) {
      if ((result as any).retryAfter) setResendCooldown((result as any).retryAfter);
      setError(result.error || 'Failed to resend.');
      return;
    }
    setSessionId((result as any).session?.session_id || sessionId);
    setDemoOtp((result as any).session?.demo_otp || demoOtp);
    setSuccess('New code sent!');
    setCountdown(300);
    setResendCooldown(60);
    setDigits(['', '', '', '', '', '']);
    setTimeout(() => { setSuccess(''); inputRefs.current[0]?.focus(); }, 3000);
  }, [resendCooldown, sessionId, email, phone, purpose, platformName, demoOtp]);

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);
    setError('');
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
    // Auto-verify when all 6 filled
    if (clean && index === 5) {
      const fullOtp = [...newDigits.slice(0, 5), clean].join('');
      if (fullOtp.length === 6) handleVerify(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      setError('');
      handleVerify(pasted);
    }
  };

  const handleVerify = useCallback(async (otpValue?: string) => {
    const otp = otpValue || digits.join('');
    if (otp.length < 6) { setError('Please enter all 6 digits.'); return; }
    if (!sessionId) { setError('Session expired. Please request a new code.'); return; }
    setVerifying(true);
    setError('');
    const result = await verifyOTP({ session_id: sessionId, otp, purpose });
    setVerifying(false);
    if (!result.ok) {
      if (result.expired) { setError('Code expired. Please request a new one.'); setCountdown(0); return; }
      if (result.maxAttempts) { setError('Too many attempts. Please request a new code.'); return; }
      if (result.attemptsRemaining !== undefined) setAttemptsLeft(result.attemptsRemaining);
      setError(result.error || 'Invalid code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }
    setVerified(true);
    setTimeout(() => onVerified(sessionId), 800);
  }, [digits, sessionId, purpose, onVerified]);

  if (verified) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
        <p className="text-lg font-black text-gray-900 dark:text-white">Verified!</p>
        <p className="text-sm text-gray-500 mt-1">Identity confirmed successfully.</p>
      </motion.div>
    );
  }

  if (!sent && !autoSend) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
          <Icon className="w-7 h-7 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">{meta.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{meta.subtitle}</p>
          {maskedIdentifier && <p className="text-sm font-semibold text-indigo-500 mt-1">{maskedIdentifier}</p>}
        </div>
        <button onClick={handleSend} disabled={sending}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</> : `Send Verification Code`}
        </button>
        {onBack && <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back</button>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
          {sending ? <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" /> : <Icon className="w-6 h-6 text-indigo-600" />}
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-white">{meta.title}</h3>
        <p className="text-sm text-gray-500 mt-1">
          Code sent to <span className="font-semibold text-indigo-500">{maskedIdentifier}</span>
        </p>
      </div>

      {/* Demo hint */}
      {demoOtp && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-bold">Demo code:</span>{' '}
            <span className="font-black tracking-[0.2em] text-amber-900 dark:text-amber-200">{demoOtp}</span>
            <span className="text-amber-500 ml-1">(email/SMS in production)</span>
          </p>
        </motion.div>
      )}

      {/* Countdown */}
      {countdown > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          Code expires in <span className={`font-bold ${countdown < 60 ? 'text-red-500' : 'text-indigo-500'}`}>{formatCountdown(countdown)}</span>
        </div>
      )}
      {countdown === 0 && sent && (
        <div className="text-center text-xs text-red-500 font-semibold">Code expired — please request a new one</div>
      )}

      {/* 6-digit input */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <motion.input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleDigitChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            disabled={verifying || verified || countdown === 0}
            whileFocus={{ scale: 1.05 }}
            className={`w-11 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all duration-150
              bg-white dark:bg-gray-800
              ${digit ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30' : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'}
              ${error ? 'border-red-400 dark:border-red-600' : ''}
              ${verifying ? 'opacity-60 cursor-not-allowed' : 'focus:border-indigo-500 focus:shadow-sm focus:shadow-indigo-200 dark:focus:shadow-indigo-900/30'}
              disabled:opacity-40 disabled:cursor-not-allowed`}
          />
        ))}
      </div>

      {/* Attempts left */}
      {attemptsLeft < 5 && attemptsLeft > 0 && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-semibold">
          {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
        </p>
      )}

      {/* Error / Success */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-xl">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verify button */}
      <button
        onClick={() => handleVerify()}
        disabled={digits.join('').length < 6 || verifying || verified || countdown === 0}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20"
      >
        {verifying ? (
          <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</>
        ) : verified ? (
          <><CheckCircle className="w-4 h-4" /> Verified!</>
        ) : (
          <><Shield className="w-4 h-4" /> Verify Code</>
        )}
      </button>

      {/* Resend */}
      <div className="text-center">
        {resendCooldown > 0 ? (
          <p className="text-sm text-gray-400">
            Resend in <span className="font-bold text-indigo-500">{resendCooldown}s</span>
          </p>
        ) : (
          <button onClick={handleResend} disabled={sending}
            className="text-sm font-semibold text-indigo-500 hover:text-indigo-400 transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto">
            {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Resend code
          </button>
        )}
      </div>

      {onBack && (
        <button onClick={onBack} className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          ← Change {email ? 'email' : 'phone'}
        </button>
      )}
    </div>
  );
}
