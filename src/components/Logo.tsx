import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'wordmark';
  clickable?: boolean;
  className?: string;
  forceTheme?: 'light' | 'dark';
}

// Inline SVG icon — works in all contexts (email, pdf, etc.)
function LogoIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="auto Flow logo icon"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="logo-dot" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#logo-bg)" />
      <circle cx="32" cy="32" r="8" fill="white" opacity="0.95" />
      <line x1="32" y1="24" x2="32" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.88" />
      <polygon points="32,8 29,14 35,14" fill="white" opacity="0.88" />
      <line x1="37.7" y1="26.3" x2="47" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.82" />
      <polygon points="50,14 43,18 47,24" fill="white" opacity="0.82" />
      <line x1="40" y1="32" x2="52" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.78" />
      <polygon points="56,32 50,29 50,35" fill="white" opacity="0.78" />
      <line x1="37.7" y1="37.7" x2="47" y2="47" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
      <polygon points="50,50 44,44 50,42" fill="white" opacity="0.72" />
      <line x1="32" y1="40" x2="32" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.78" />
      <polygon points="32,56 29,50 35,50" fill="white" opacity="0.78" />
      <line x1="26.3" y1="37.7" x2="17" y2="47" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.72" />
      <polygon points="14,50 14,43 20,47" fill="white" opacity="0.72" />
      <line x1="24" y1="32" x2="12" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.78" />
      <polygon points="8,32 14,29 14,35" fill="white" opacity="0.78" />
      <line x1="26.3" y1="26.3" x2="17" y2="17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.82" />
      <polygon points="14,14 20,18 18,24" fill="white" opacity="0.82" />
      <circle cx="32" cy="32" r="3.5" fill="url(#logo-dot)" />
    </svg>
  );
}

const SIZES = {
  sm:  { icon: 28, text: 'text-base',  gap: 'gap-2' },
  md:  { icon: 36, text: 'text-xl',    gap: 'gap-2.5' },
  lg:  { icon: 44, text: 'text-2xl',   gap: 'gap-3' },
  xl:  { icon: 56, text: 'text-3xl',   gap: 'gap-4' },
};

export default function Logo({ size = 'md', variant = 'full', clickable = false, className = '', forceTheme }: LogoProps) {
  const { platformSettings, theme } = useApp();
  const navigate = useNavigate();
  const s = SIZES[size];
  const isDark = forceTheme ? forceTheme === 'dark' : theme === 'dark';
  const platformName = platformSettings?.platform_name || 'auto Flow';
  const customLogoUrl = platformSettings?.platform_logo_url;

  const handleClick = () => { if (clickable) navigate('/'); };

  if (variant === 'icon') {
    return (
      <div onClick={handleClick} className={`flex-shrink-0 ${clickable ? 'cursor-pointer' : ''} ${className}`}>
        {customLogoUrl ? (
          <img src={customLogoUrl} alt={platformName} width={s.icon} height={s.icon} className="rounded-xl object-contain" />
        ) : (
          <LogoIcon size={s.icon} />
        )}
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div onClick={handleClick} className={`flex items-center ${s.gap} ${clickable ? 'cursor-pointer' : ''} ${className}`}>
        <span className={`font-black tracking-tight ${s.text} ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {platformName.includes(' ') ? platformName.split(' ')[0] : platformName.slice(0, -2)}
          <span className="text-indigo-500">{platformName.includes(' ') ? ' ' + platformName.split(' ').slice(1).join(' ') : platformName.slice(-2)}</span>
        </span>
      </div>
    );
  }

  // Full: icon + wordmark
  return (
    <div onClick={handleClick} className={`flex items-center ${s.gap} ${clickable ? 'cursor-pointer group' : ''} ${className}`}>
      <div className={`flex-shrink-0 transition-transform duration-200 ${clickable ? 'group-hover:scale-105' : ''}`}>
        {customLogoUrl ? (
          <img src={customLogoUrl} alt={platformName} width={s.icon} height={s.icon} className="rounded-xl object-contain" />
        ) : (
          <LogoIcon size={s.icon} />
        )}
      </div>
      <span className={`font-black tracking-tight ${s.text} ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {platformName.includes(' ') ? platformName.split(' ')[0] : platformName.slice(0, -2)}
        <span className="text-indigo-500">{platformName.includes(' ') ? ' ' + platformName.split(' ').slice(1).join(' ') : platformName.slice(-2)}</span>
      </span>
    </div>
  );
}

// Standalone icon export for use without context
export function LogoIconStandalone({ size = 32, className = '' }: { size?: number; className?: string }) {
  return <LogoIcon size={size} className={className} />;
}
