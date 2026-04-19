/**
 * Terms of Service + Privacy Policy pages.
 *
 * Visual language mirrors the landing page: same indigo/violet gradient
 * accents, soft background blobs, rounded-2xl cards, dark-mode aware.
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Lock, FileText, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import ScrollToTop from '../components/ui/ScrollToTop';
import PlatformLogo from '../components/PlatformLogo';

function LegalShell({ title, subtitle, icon: Icon, children }: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const { lang, platformSettings } = useApp();
  const navigate = useNavigate();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white min-h-screen">
      <ScrollToTop />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
            aria-label="Home"
          >
            <PlatformLogo size="sm" variant="full" />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t(lang, 'legal_back')}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-6"
          >
            <Icon className="w-4 h-4" />
            {subtitle}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight"
          >
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
              {title}
            </span>
          </motion.h1>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t(lang, 'legal_last_updated')}: 2026-04-01
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="relative pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-500/5"
          >
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 leading-relaxed">
              {children}
            </div>
          </motion.article>

          <div className="mt-10 p-6 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-start gap-4">
            <Mail className="w-5 h-5 mt-1 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-gray-900 dark:text-white">{t(lang, 'legal_contact_title')}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t(lang, 'legal_contact_body')}{' '}
                <a href={`mailto:support@${platformName.toLowerCase().replace(/\s+/g, '')}.io`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  support@{platformName.toLowerCase().replace(/\s+/g, '')}.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">{t(lang, 'footer_rights')}</p>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => navigate('/terms')} className="hover:text-indigo-400 transition-colors">
              {t(lang, 'legal_terms')}
            </button>
            <button onClick={() => navigate('/privacy')} className="hover:text-indigo-400 transition-colors">
              {t(lang, 'legal_privacy')}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <Lock className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black text-gray-900 dark:text-white mt-4 mb-3">{heading}</h2>
      <div className="text-gray-700 dark:text-gray-300 space-y-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function TermsPage() {
  const { lang, platformSettings } = useApp();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  return (
    <LegalShell
      title={t(lang, 'legal_terms')}
      subtitle={t(lang, 'legal_terms_sub')}
      icon={FileText}
    >
      <p>
        {t(lang, 'terms_intro').replace('{platform}', platformName)}
      </p>

      <Section heading={t(lang, 'terms_h_accounts')}>
        <p>{t(lang, 'terms_accounts').replace('{platform}', platformName)}</p>
      </Section>

      <Section heading={t(lang, 'terms_h_use')}>
        <ul className="list-disc ms-6 space-y-1">
          <li>{t(lang, 'terms_use_1')}</li>
          <li>{t(lang, 'terms_use_2')}</li>
          <li>{t(lang, 'terms_use_3')}</li>
          <li>{t(lang, 'terms_use_4')}</li>
        </ul>
      </Section>

      <Section heading={t(lang, 'terms_h_billing')}>
        <p>{t(lang, 'terms_billing_1')}</p>
        <p>{t(lang, 'terms_billing_2')}</p>
      </Section>

      <Section heading={t(lang, 'terms_h_data')}>
        <p>{t(lang, 'terms_data_1').replace('{platform}', platformName)}</p>
      </Section>

      <Section heading={t(lang, 'terms_h_termination')}>
        <p>{t(lang, 'terms_termination_1')}</p>
      </Section>

      <Section heading={t(lang, 'terms_h_liability')}>
        <p>{t(lang, 'terms_liability_1').replace('{platform}', platformName)}</p>
      </Section>

      <Section heading={t(lang, 'terms_h_changes')}>
        <p>{t(lang, 'terms_changes_1')}</p>
      </Section>
    </LegalShell>
  );
}

// ---------------------------------------------------------------------------

export function PrivacyPage() {
  const { lang, platformSettings } = useApp();
  const platformName = platformSettings?.platform_name || 'auto Flow';

  return (
    <LegalShell
      title={t(lang, 'legal_privacy')}
      subtitle={t(lang, 'legal_privacy_sub')}
      icon={Shield}
    >
      <p>{t(lang, 'privacy_intro').replace('{platform}', platformName)}</p>

      <Section heading={t(lang, 'privacy_h_collect')}>
        <ul className="list-disc ms-6 space-y-1">
          <li>{t(lang, 'privacy_collect_1')}</li>
          <li>{t(lang, 'privacy_collect_2')}</li>
          <li>{t(lang, 'privacy_collect_3')}</li>
          <li>{t(lang, 'privacy_collect_4')}</li>
        </ul>
      </Section>

      <Section heading={t(lang, 'privacy_h_use')}>
        <p>{t(lang, 'privacy_use_1')}</p>
        <ul className="list-disc ms-6 space-y-1">
          <li>{t(lang, 'privacy_use_2')}</li>
          <li>{t(lang, 'privacy_use_3')}</li>
          <li>{t(lang, 'privacy_use_4')}</li>
        </ul>
      </Section>

      <Section heading={t(lang, 'privacy_h_sharing')}>
        <p>{t(lang, 'privacy_sharing_1')}</p>
      </Section>

      <Section heading={t(lang, 'privacy_h_storage')}>
        <p>{t(lang, 'privacy_storage_1')}</p>
      </Section>

      <Section heading={t(lang, 'privacy_h_rights')}>
        <ul className="list-disc ms-6 space-y-1">
          <li>{t(lang, 'privacy_rights_1')}</li>
          <li>{t(lang, 'privacy_rights_2')}</li>
          <li>{t(lang, 'privacy_rights_3')}</li>
          <li>{t(lang, 'privacy_rights_4')}</li>
        </ul>
      </Section>

      <Section heading={t(lang, 'privacy_h_cookies')}>
        <p>{t(lang, 'privacy_cookies_1')}</p>
      </Section>

      <Section heading={t(lang, 'privacy_h_children')}>
        <p>{t(lang, 'privacy_children_1')}</p>
      </Section>

      <Section heading={t(lang, 'privacy_h_changes')}>
        <p>{t(lang, 'privacy_changes_1')}</p>
      </Section>
    </LegalShell>
  );
}
