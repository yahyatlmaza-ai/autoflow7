import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Language } from '../lib/i18n';
import type { Theme } from '../lib/theme';
import { applyTheme, getStoredTheme } from '../lib/theme';
import {
  ApiError,
  authApi,
  getToken,
  setToken,
  subscriptionsApi,
  type ApiTenant,
  type ApiUser,
  type ApiSubscriptionStatus,
} from '../lib/api';

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

// UI-layer representation of the logged-in user. Historical code uses
// `user.id`, `user.email`, `user.name`, `user.isDemo`, so we preserve those
// field names and also expose the raw FastAPI payload.
export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: number;
  isDemo?: boolean;
  raw?: ApiUser;
}

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  currency: string;
  setCurrency: (c: string) => void;
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  tenant: ApiTenant | null;
  subscription: ApiSubscriptionStatus | null;
  refreshSubscription: () => Promise<ApiSubscriptionStatus | null>;
  signIn: (token: string, user: ApiUser, tenant: ApiTenant) => void;
  signOut: () => void;
  authChecked: boolean;
  platformSettings: PlatformSettings;
  setPlatformSettings: (s: PlatformSettings) => void;
  refreshSettings: () => Promise<void>;
  isDemo: boolean;
  setIsDemo: (d: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

const defaultSettings: PlatformSettings = {
  platform_name: 'auto Flow',
  platform_tagline: 'Premium Logistics Automation Platform',
  platform_logo_url: '',
  platform_primary_color: '#6366f1',
  support_whatsapp: '213794157508',
  support_email: 'support@autoflow.dz',
  default_currency: 'DZD',
  default_language: 'ar',
  auto_forward_global: 'false',
  trial_days: '14',
};

const AppContext = createContext<AppContextType>({} as AppContextType);

function toAppUser(u: ApiUser): AppUser {
  return {
    id: String(u.id),
    email: u.email,
    name: u.full_name || u.email,
    role: u.role,
    tenant_id: u.tenant_id,
    raw: u,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>(getStoredTheme());
  const [currency, setCurrencyState] = useState('DZD');
  const [user, setUserState] = useState<AppUser | null>(null);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<ApiTenant | null>(null);
  const [subscription, setSubscription] = useState<ApiSubscriptionStatus | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [platformSettings, setPlatformSettingsState] = useState<PlatformSettings>(defaultSettings);
  const [isDemo, setIsDemo] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
    try { localStorage.setItem('octomatic-lang', l); } catch { /* ignore */ }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t, true);
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    try { localStorage.setItem('octomatic-currency', c); } catch { /* ignore */ }
  }, []);

  const setUser = useCallback((u: AppUser | null) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem('af_user', JSON.stringify(u));
      else localStorage.removeItem('af_user');
    } catch { /* ignore */ }
  }, []);

  const setProfile = useCallback((p: UserProfile | null) => {
    setProfileState(p);
    if (p) {
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
    // Platform settings are hard-coded for now; kept as a no-op to preserve
    // the existing hook contract used elsewhere.
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!getToken()) {
      setSubscription(null);
      return null;
    }
    try {
      const s = await subscriptionsApi.status();
      setSubscription(s);
      return s;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
        setUserState(null);
        setTenant(null);
        setSubscription(null);
      }
      return null;
    }
  }, []);

  const signIn = useCallback((token: string, u: ApiUser, t: ApiTenant) => {
    setToken(token);
    const appUser = toAppUser(u);
    setUser(appUser);
    setTenant(t);
    void refreshSubscription();
  }, [setUser, refreshSubscription]);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setTenant(null);
    setSubscription(null);
    setProfileState(null);
    try { localStorage.removeItem('af_user'); } catch { /* ignore */ }
  }, [setUser]);

  // Bootstrap — apply theme, language, and restore session from stored token.
  useEffect(() => {
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme, false);

    try {
      const storedLang = localStorage.getItem('octomatic-lang') as Language | null;
      if (storedLang) setLang(storedLang);
      const storedCurrency = localStorage.getItem('octomatic-currency');
      if (storedCurrency) setCurrencyState(storedCurrency);
    } catch { /* ignore */ }

    void refreshSettings();

    const token = getToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    authApi.me()
      .then((res) => {
        setUserState(toAppUser(res.user));
        setTenant(res.tenant);
        return refreshSubscription();
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{
      lang, setLang,
      theme, setTheme,
      currency, setCurrency,
      user, setUser,
      profile, setProfile,
      tenant,
      subscription,
      refreshSubscription,
      signIn,
      signOut,
      authChecked,
      platformSettings, setPlatformSettings, refreshSettings,
      isDemo, setIsDemo,
      sidebarCollapsed, setSidebarCollapsed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
