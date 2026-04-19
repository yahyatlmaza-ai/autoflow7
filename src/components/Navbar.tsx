import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Moon, Sun, Globe, ChevronDown, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t, type Language } from '../lib/i18n';
import Logo from './Logo';

export default function Navbar() {
  const { lang, setLang, theme, setTheme, user, platformSettings } = useApp();
  const waNumber = platformSettings?.support_whatsapp || '213794157508';
  const waUrl = `https://wa.me/${waNumber}`;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const langs: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇩🇿' },
  ];

  const navLinks = [
    { key: 'nav_features', href: '#features' },
    { key: 'nav_howit', href: '#how-it-works' },
    { key: 'nav_integrations', href: '#integrations' },
    { key: 'nav_pricing', href: '#pricing' },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl shadow-lg shadow-black/5 dark:shadow-black/20 border-b border-gray-200/60 dark:border-gray-800/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <Logo size="sm" variant="full" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.key} href={link.href}
                className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 relative group">
                {t(lang, link.key)}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Language */}
            <div className="relative">
              <button onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all">
                <Globe className="w-4 h-4" />
                <span>{langs.find(l => l.code === lang)?.flag}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-44 z-50"
                  >
                    <div className="py-1.5">
                      {langs.map(l => (
                        <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                            lang === l.code ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}>
                          <span className="text-base">{l.flag}</span>
                          {l.label}
                          {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme */}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <AnimatePresence mode="wait">
                <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.div>
              </AnimatePresence>
            </button>

            {user ? (
              <button onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-500/30">
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t(lang, 'nav_login')}
                </button>
                <button onClick={() => navigate('/demo')}
                  className="px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {t(lang, 'nav_demo')}
                </button>
                <button onClick={() => navigate('/signup')}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5">
                  {t(lang, 'nav_signup')}
                </button>
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  title="WhatsApp"
                  className="relative flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md shadow-green-500/30 hover:-translate-y-0.5">
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                  </span>
                  <MessageCircle className="w-4 h-4" />
                </a>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <AnimatePresence mode="wait">
              <motion.div key={mobileOpen ? 'x' : 'm'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map(link => (
                <a key={link.key} href={link.href} onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
                  {t(lang, link.key)}
                </a>
              ))}
              <div className="pt-3 space-y-2">
                <button onClick={() => navigate('/login')} className="w-full px-4 py-3 text-sm font-bold text-center border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200">{t(lang, 'nav_login')}</button>
                <button onClick={() => navigate('/demo')} className="w-full px-4 py-3 text-sm font-bold text-center border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200">{t(lang, 'nav_demo')}</button>
                <button onClick={() => navigate('/signup')} className="w-full px-4 py-3 text-sm font-bold text-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl">{t(lang, 'nav_signup')}</button>
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-center bg-green-500 text-white rounded-xl">
                  <MessageCircle className="w-4 h-4" />
                  {t(lang, 'nav_trial')}
                </a>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-2">
                  {langs.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setMobileOpen(false); }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold flex items-center gap-1 ${lang === l.code ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'text-gray-500'}`}>
                      {l.flag} {l.code.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg text-gray-500">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
