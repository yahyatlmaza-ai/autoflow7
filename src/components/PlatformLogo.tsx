import { useApp } from '../context/AppContext';

interface PlatformLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full' | 'text-only';
  className?: string;
  forceTheme?: 'light' | 'dark';
}

export default function PlatformLogo({ size = 'md', variant = 'icon', className = '', forceTheme }: PlatformLogoProps) {
  const { platformSettings, theme } = useApp();
  const platformName = platformSettings?.platform_name || 'ShipDZ';
  const logoUrl = platformSettings?.platform_logo_url;
  const isDark = forceTheme ? forceTheme === 'dark' : theme === 'dark';

  const iconSizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl', xl: 'text-3xl' };
  const iconInnerSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-8 h-8' };

  // Split platform name for two-tone text rendering
  const splitAt = Math.ceil(platformName.length / 2);
  const part1 = platformName.slice(0, splitAt);
  const part2 = platformName.slice(splitAt);

  const IconBox = () => (
    <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 ${className}`}>
      {logoUrl ? (
        <img src={logoUrl} alt={platformName} className={`${iconInnerSizes[size]} object-contain`} />
      ) : (
        // SVG octopus-routes icon
        <svg viewBox="0 0 32 32" className={iconInnerSizes[size]} fill="none">
          {/* Body */}
          <circle cx="16" cy="15" r="4.5" fill="white" opacity="0.95" />
          {/* Tentacles as routes */}
          <path d="M16 10.5 L16 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
          <polygon points="16,3 14.2,6 17.8,6" fill="white" opacity="0.9" />
          <path d="M19.2 12.5 L23.5 8.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <polygon points="25.5,7 21.5,8.2 22.8,12" fill="white" opacity="0.85" />
          <path d="M20.5 15 L27 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
          <polygon points="29,15 25.5,13.2 25.5,16.8" fill="white" opacity="0.8" />
          <path d="M19 18.5 L22.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
          <polygon points="23.5,25.5 20,22.5 24,21" fill="white" opacity="0.75" />
          <path d="M13 18.5 L9.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.75" />
          <polygon points="8.5,25.5 8,21 12,22.5" fill="white" opacity="0.75" />
          <path d="M11.5 15 L5 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
          <polygon points="3,15 6.5,13.2 6.5,16.8" fill="white" opacity="0.8" />
          <path d="M12.8 12.5 L8.5 8.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
          <polygon points="6.5,7 9.2,11 13,9.8" fill="white" opacity="0.85" />
          {/* Inner dot */}
          <circle cx="16" cy="15" r="2" fill="rgba(129,140,248,0.9)" />
        </svg>
      )}
    </div>
  );

  if (variant === 'icon') return <IconBox />;

  if (variant === 'text-only') {
    return (
      <span className={`font-black tracking-tight ${textSizes[size]} ${className}`}>
        <span className={isDark ? 'text-white' : 'text-gray-900'}>{part1}</span>
        <span className="text-indigo-500">{part2}</span>
      </span>
    );
  }

  // Full: icon + text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconBox />
      <span className={`font-black tracking-tight ${textSizes[size]}`}>
        <span className={isDark ? 'text-white' : 'text-gray-900'}>{part1}</span>
        <span className="text-indigo-500">{part2}</span>
      </span>
    </div>
  );
}
