/**
 * Client-side device fingerprinting for trial abuse prevention.
 * Combines multiple stable browser signals into a hash.
 */

async function sha256(str: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple hash
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16);
  }
}

export async function getDeviceFingerprint(): Promise<string> {
  const signals: string[] = [];

  // Browser signals
  signals.push(navigator.userAgent || '');
  signals.push(navigator.language || '');
  signals.push(navigator.platform || '');
  signals.push(String(navigator.hardwareConcurrency || 0));
  signals.push(String(navigator.maxTouchPoints || 0));

  // Screen signals
  signals.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  signals.push(String(window.devicePixelRatio || 1));

  // Timezone
  signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('ShipDZ🔐', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('ShipDZ🔐', 4, 17);
      signals.push(canvas.toDataURL().slice(0, 100));
    }
  } catch {}

  // WebGL renderer
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        signals.push(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
        signals.push(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || '');
      }
    }
  } catch {}

  // Fonts detection (limited)
  const testFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana'];
  const canvas2 = document.createElement('canvas');
  const ctx2 = canvas2.getContext('2d');
  if (ctx2) {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const detected: string[] = [];
    for (const font of testFonts) {
      for (const base of baseFonts) {
        ctx2.font = `72px ${base}`;
        const baseW = ctx2.measureText('mmmmm').width;
        ctx2.font = `72px '${font}', ${base}`;
        const testW = ctx2.measureText('mmmmm').width;
        if (baseW !== testW) { detected.push(font); break; }
      }
    }
    signals.push(detected.join(','));
  }

  const raw = signals.join('||');
  return sha256(raw);
}

export function getStoredFingerprint(): string | null {
  try { return localStorage.getItem('shipdz-fp') || localStorage.getItem('octomatic-fp'); } catch { return null; }
}

export function storeFingerprint(fp: string) {
  try {
    localStorage.setItem('shipdz-fp', fp);
    // Also set a cookie for extra tracking
    document.cookie = `sdz_fp=${fp.slice(0, 32)}; max-age=${365 * 24 * 3600}; SameSite=Lax`;
  } catch {}
}

export function getTrialCookie(): string | null {
  try {
    const match = document.cookie.match(/sdz_trial=([^;]+)/) || document.cookie.match(/octo_trial=([^;]+)/);
    return match ? match[1] : null;
  } catch { return null; }
}

export function setTrialCookie(email: string) {
  try {
    const val = btoa(email + '|' + Date.now());
    document.cookie = `sdz_trial=${val}; max-age=${365 * 24 * 3600}; SameSite=Lax`;
    localStorage.setItem('shipdz-trial-used', '1');
    localStorage.setItem('shipdz-trial-email', email);
  } catch {}
}

export function hasTrialBeenUsed(): boolean {
  try {
    return !!localStorage.getItem('shipdz-trial-used') || !!localStorage.getItem('octomatic-trial-used') || !!getTrialCookie();
  } catch { return false; }
}
