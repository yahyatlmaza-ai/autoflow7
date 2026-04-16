import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Language } from '../lib/i18n';
import type { Theme } from '../lib/theme';
import { applyTheme, getStoredTheme } from '../lib/theme';

export interface PlatformSettings {
  platform_name: string;
  platform_tagline: string;
  platform_logo_url: string;
  platform_primary_color: string;
  support_whatsapp: string;
  support_email: string;
  default_currency: string;
  default_language: string;
  auto_forward_global: string;
  trial_days: string;
  [key: string]: string;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  name: string;
  company?: string;
  phone?: string;
  wilaya?: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  plan: string;
  trial_end?: string;
  theme: Theme;
  language: Language;
  currency: string;
  auto_forward: boolean;
  onboarding_complete: boolean;
  onboarding_step: number;
  avatar_url?: string;
}

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  currency: string;
  setCurrency: (c: string) => void;
  user: any;
  setUser: (u: any) => void;
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  platformSettings: PlatformSettings;
  setPlatformSettings: (s: PlatformSettings) => void;
  refreshSettings: () => Promise<void>;
  isDemo: boolean;
  setIsDemo: (d: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

const defaultSettings: PlatformSettings = {
  platform_name: 'DeliverPro',
  platform_tagline: 'Premium Logistics Automation Platform',
  platform_logo_url: '',
  platform_primary_color: '#6366f1',
  support_whatsapp: '213794157508',
  support_email: 'support@deliverpro.dz',
  default_currency: 'DZD',
  default_language: 'ar',
  auto_forward_global: 'false',
  trial_days: '10',
};

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>(getStoredTheme());
  const [currency, setCurrencyState] = useState('DZD');
  const [user, setUserState] = useState<any>(null);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [platformSettings, setPlatformSettingsState] = useState<PlatformSettings>(defaultSettings);
  const [isDemo, setIsDemo] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    try { localStorage.setItem('octomatic-lang', l); } catch {}
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t, true); // animated
    // Persist to profile if user logged in
    const storedUser = localStorage.getItem('shipdz-user') || localStorage.getItem('octomatic-user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u?.id && !u.isDemo) {
          fetch('/api/profiles', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: u.id, theme: t }),
          }).catch(() => {});
        }
      } catch {}
    }
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    try { localStorage.setItem('octomatic-currency', c); } catch {}
  }, []);

  const setUser = useCallback((u: any) => {
    setUserState(u);
    if (u) {
      try { localStorage.setItem('shipdz-user', JSON.stringify(u)); } catch {}
    } else {
      try { localStorage.removeItem('shipdz-user'); } catch {}
    }
  }, []);

  const setProfile = useCallback((p: UserProfile | null) => {
    setProfileState(p);
    if (p) {
      // Sync theme from profile (cross-device persistence)
      if (p.theme && p.theme !== theme) {
        setThemeState(p.theme);
        applyTheme(p.theme, false);
      }
      if (p.language) setLang(p.language);
      if (p.currency) setCurrencyState(p.currency);
    }
  }, [theme, setLang]);

  const setPlatformSettings = useCallback((s: PlatformSettings) => {
    setPlatformSettingsState(s);
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setPlatformSettingsState(prev => ({ ...prev, ...data }));
      }
    } catch {}
  }, []);

  // Bootstrap
  useEffect(() => {
    // Apply theme immediately (no flash)
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme, false);

    // Language
    try {
      const storedLang = localStorage.getItem('octomatic-lang') as Language;
      if (storedLang) setLang(storedLang);
      const storedCurrency = localStorage.getItem('octomatic-currency');
      if (storedCurrency) setCurrencyState(storedCurrency);
    } catch {}

    // User session — use new af_user key, fall back to legacy keys
    try {
      const storedUser =
        localStorage.getItem('af_user') ||
        localStorage.getItem('octomatic-user') ||
        localStorage.getItem('shipdz-user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUserState(u);
        if (u.isDemo) setIsDemo(true);
      }
    } catch {}

    // Platform settings
    refreshSettings();
  }, []);

  // Sync theme with profile on user load
  useEffect(() => {
    if (user?.id && !user.isDemo) {
      fetch(`/api/profiles?user_id=${user.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(p => {
          if (p) {
            setProfileState(p);
            if (p.theme && p.theme !== theme) {
              setThemeState(p.theme);
              applyTheme(p.theme, false);
            }
            if (p.language) setLang(p.language as Language);
            if (p.currency) setCurrencyState(p.currency);
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  return (
    <AppContext.Provider value={{
      lang, setLang,
      theme, setTheme,
      currency, setCurrency,
      user, setUser,
      profile, setProfile,
      platformSettings, setPlatformSettings, refreshSettings,
      isDemo, setIsDemo,
      sidebarCollapsed, setSidebarCollapsed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
