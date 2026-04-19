import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, BarChart3, Shield, Zap, RefreshCw, Users,
  CheckCircle, ChevronDown, ArrowRight, Star, Play,
  ShoppingBag, MapPin, MessageCircle, Crown, Headphones,
  Bot, Sparkles, Rocket, TrendingUp, Lock, Gift,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import ScrollToTop from '../components/ui/ScrollToTop';
import PlatformLogo from '../components/PlatformLogo';

const WHATSAPP_NUMBER = '213794157508';

// WhatsApp brand icon (inline SVG — matches Meta / WhatsApp official glyph)
function WhatsAppIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.708.888.928 0 2.335-.95 2.335-1.977 0-.174-.073-.344-.115-.515-.488-.617-1.17-.843-1.83-1.17-.272-.133-.588-.293-.859-.293zM15.99 3c7.175 0 13 5.825 13 13 0 2.562-.744 4.95-2.027 6.966l2.18 6.451-6.685-2.136a12.976 12.976 0 0 1-6.466 1.72C8.817 29 3 23.176 3 16S8.817 3 15.99 3zm0 2.515A10.466 10.466 0 0 0 5.515 16c0 2.015.591 3.892 1.61 5.472l-1.03 3.05 3.157-1.01a10.415 10.415 0 0 0 6.74 2.46c5.776 0 10.485-4.709 10.485-10.485 0-5.776-4.709-10.485-10.485-10.485z"/>
    </svg>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.7, ease: 'easeOut' as const } }),
};

const stats = [
  { key: 'hero_stat1', value: '2M+' },
  { key: 'hero_stat2', value: '5K+' },
  { key: 'hero_stat3', value: '12+' },
  { key: 'hero_stat4', value: '99.9%' },
];

const features = [
  { icon: Truck, key1: 'feat1_title', key2: 'feat1_desc', color: 'from-blue-500 to-cyan-500' },
  { icon: Zap, key1: 'feat2_title', key2: 'feat2_desc', color: 'from-amber-500 to-orange-500' },
  { icon: MapPin, key1: 'feat3_title', key2: 'feat3_desc', color: 'from-green-500 to-emerald-500' },
  { icon: Package, key1: 'feat4_title', key2: 'feat4_desc', color: 'from-purple-500 to-violet-500' },
  { icon: BarChart3, key1: 'feat5_title', key2: 'feat5_desc', color: 'from-pink-500 to-rose-500' },
  { icon: ShoppingBag, key1: 'feat6_title', key2: 'feat6_desc', color: 'from-indigo-500 to-blue-500' },
  { icon: Users, key1: 'feat7_title', key2: 'feat7_desc', color: 'from-teal-500 to-cyan-500' },
  { icon: RefreshCw, key1: 'feat8_title', key2: 'feat8_desc', color: 'from-red-500 to-orange-500' },
];

const vipFeatures = [
  { icon: Headphones, key1: 'vip_feat1_title', key2: 'vip_feat1_desc' },
  { icon: Zap, key1: 'vip_feat2_title', key2: 'vip_feat2_desc' },
  { icon: Rocket, key1: 'vip_feat3_title', key2: 'vip_feat3_desc' },
  { icon: Bot, key1: 'vip_feat4_title', key2: 'vip_feat4_desc' },
  { icon: Sparkles, key1: 'vip_feat5_title', key2: 'vip_feat5_desc' },
  { icon: Gift, key1: 'vip_feat6_title', key2: 'vip_feat6_desc' },
  { icon: Crown, key1: 'vip_feat7_title', key2: 'vip_feat7_desc' },
  { icon: TrendingUp, key1: 'vip_feat8_title', key2: 'vip_feat8_desc' },
];

const steps = [
  { num: '01', key1: 'how1_title', key2: 'how1_desc' },
  { num: '02', key1: 'how2_title', key2: 'how2_desc' },
  { num: '03', key1: 'how3_title', key2: 'how3_desc' },
  { num: '04', key1: 'how4_title', key2: 'how4_desc' },
];

const algerianCarriers = [
  { name: 'Yalidine', logo: '📦' },
  { name: 'ZR Express', logo: '🚚' },
  { name: 'Noest', logo: '⚡' },
  { name: 'Amana', logo: '🏷️' },
  { name: 'EMS Algeria', logo: '📬' },
];

const intlCarriers = [
  { name: 'DHL', logo: '🟡' },
  { name: 'FedEx', logo: '🟣' },
  { name: 'UPS', logo: '🟤' },
  { name: 'Aramex', logo: '🔵' },
];

const platforms = [
  { name: 'Shopify', logo: '🛝' },
  { name: 'WooCommerce', logo: '🛎️' },
  { name: 'Magento', logo: '🔶' },
  { name: 'OpenCart', logo: '🛒' },
  { name: 'Custom API', logo: '🔧' },
];

// New pricing: Starter (free trial), Professional (20,000 DZD / 180 days / 5,000 orders),
// and VIP Lifetime (45,000 DZD / 5.5 years with full VIP support)
type Plan = {
  key: string;
  price: { DZD: string; USD: string; EUR: string } | null;
  duration: string;
  durationKey: { en: string; fr: string; ar: string };
  features: { en: string; fr: string; ar: string }[];
  badge: 'popular' | 'vip' | null;
  accent: string;
};

const plans: Plan[] = [
  {
    key: 'pricing_basic',
    price: { DZD: '0', USD: '0', EUR: '0' },
    duration: '10 days free',
    durationKey: { en: '10-day free trial', fr: 'essai gratuit 10 jours', ar: 'تجربة مجانية 10 أيام' },
    features: [
      { en: '500 orders', fr: '500 commandes', ar: '500 طلب' },
      { en: '2 stores', fr: '2 boutiques', ar: '2 متجر' },
      { en: '5 carriers', fr: '5 transporteurs', ar: '5 شركات شحن' },
      { en: 'Basic analytics', fr: 'Analytique de base', ar: 'تحليلات أساسية' },
      { en: 'Email support', fr: 'Support par email', ar: 'دعم بالبريد' },
    ],
    badge: null,
    accent: 'from-slate-500 to-slate-600',
  },
  {
    key: 'pricing_pro',
    price: { DZD: '20,000', USD: '149', EUR: '137' },
    duration: '180 days',
    durationKey: { en: 'for 180 days', fr: 'pour 180 jours', ar: 'لمدة 180 يوم' },
    features: [
      { en: '5,000 orders', fr: '5 000 commandes', ar: '5,000 طلب' },
      { en: 'Unlimited stores', fr: 'Boutiques illimitées', ar: 'متاجر غير محدودة' },
      { en: 'All carriers (DZ + international)', fr: 'Tous les transporteurs', ar: 'كل شركات الشحن (محلية ودولية)' },
      { en: 'Advanced analytics', fr: 'Analytique avancée', ar: 'تحليلات متقدمة' },
      { en: 'Priority support', fr: 'Support prioritaire', ar: 'دعم ذو أولوية' },
      { en: 'Full COD management', fr: 'Gestion COD complète', ar: 'إدارة كاملة للدفع عند الاستلام' },
      { en: 'Bulk order operations', fr: 'Opérations en masse', ar: 'عمليات جماعية على الطلبات' },
      { en: 'WhatsApp support', fr: 'Support WhatsApp', ar: 'دعم واتساب' },
    ],
    badge: 'popular',
    accent: 'from-indigo-600 to-violet-600',
  },
  {
    key: 'pricing_ent',
    price: { DZD: '45,000', USD: '335', EUR: '308' },
    duration: '5.5 years',
    durationKey: { en: 'for 5.5 years', fr: 'pour 5,5 ans', ar: 'لمدة 5.5 سنوات' },
    features: [
      { en: 'Unlimited orders', fr: 'Commandes illimitées', ar: 'طلبات غير محدودة' },
      { en: 'Unlimited stores & carriers', fr: 'Boutiques & transporteurs illimités', ar: 'متاجر وناقلات بلا حدود' },
      { en: 'All VIP features included', fr: 'Toutes les fonctions VIP', ar: 'جميع مميزات VIP مشمولة' },
      { en: 'Dedicated account manager', fr: 'Responsable de compte dédié', ar: 'مدير حساب مخصص' },
      { en: '24/7 priority WhatsApp line', fr: 'Ligne WhatsApp prioritaire 24/7', ar: 'خط واتساب VIP 24/7' },
      { en: 'AI shipping optimizer', fr: "Optimiseur IA d'expédition", ar: 'محسّن شحن بالذكاء الاصطناعي' },
      { en: 'Custom integrations on demand', fr: 'Intégrations personnalisées', ar: 'تكاملات مخصصة حسب الطلب' },
      { en: 'White-label branding', fr: 'Marque blanche', ar: 'علامة تجارية بيضاء' },
      { en: 'Monthly 1:1 training', fr: 'Formation 1:1 mensuelle', ar: 'تدريب شهري 1:1' },
      { en: 'SLA guarantee 99.9%', fr: 'Garantie SLA 99.9%', ar: 'ضمان SLA بنسبة 99.9%' },
    ],
    badge: 'vip',
    accent: 'from-amber-500 via-orange-500 to-pink-600',
  },
];

const testimonials = [
  {
    name: 'Karim Boudiaf',
    role: 'E-commerce Owner, Algiers',
    text: 'auto Flow transformed my logistics. I went from manually processing 50 orders a day to automating 500+. The Yalidine and ZR Express integrations are flawless.',
    rating: 5,
    avatar: 'KB',
  },
  {
    name: 'Sarah Meziane',
    role: 'Founder, Fashion Store',
    text: 'The COD management feature alone saved me hours every week. Real-time tracking and the analytics dashboard give me complete visibility over my business.',
    rating: 5,
    avatar: 'SM',
  },
  {
    name: 'Ahmed Taleb',
    role: 'Multi-store Merchant, Oran',
    text: 'Managing 3 stores and 2 warehouses was a nightmare before auto Flow. Now everything is in one place. The Arabic RTL support is perfect.',
    rating: 5,
    avatar: 'AT',
  },
  {
    name: 'Lina Hadjadj',
    role: 'Shopify Seller, Constantine',
    text: 'The Shopify integration was up in minutes. Orders flow automatically and labels are generated instantly. Best investment for my business.',
    rating: 5,
    avatar: 'LH',
  },
];

const faqs = [
  {
    q: 'How does the 10-day free trial work?',
    a: 'Sign up with your email, verify your account, and get instant access to all Professional plan features for 10 days. No credit card required.',
  },
  {
    q: 'Which Algerian carriers are supported?',
    a: 'We support Yalidine, ZR Express, Noest, Amana, and EMS Algeria, with more being added regularly. International carriers include DHL, FedEx, UPS, and Aramex.',
  },
  {
    q: 'Can I connect multiple e-commerce stores?',
    a: 'Yes! You can connect Shopify, WooCommerce, Magento, OpenCart, and custom APIs. The Professional plan supports unlimited stores.',
  },
  {
    q: 'Is Arabic RTL supported?',
    a: 'Absolutely. auto Flow fully supports Arabic with RTL layout, French, and English without any interface changes.',
  },
  {
    q: 'How is COD managed?',
    a: 'Our COD module tracks all cash-on-delivery orders, reconciles payments from carriers, and provides detailed reports and automated follow-ups.',
  },
  {
    q: 'What currencies are supported?',
    a: 'Algerian Dinar (DZD) is the default currency. USD and EUR are also supported with automatic conversion.',
  },
  {
    q: 'How is VIP support different from regular support?',
    a: 'VIP subscribers get a dedicated account manager, priority WhatsApp line that answers in under 2 minutes, free custom integrations, and monthly 1:1 training sessions with our logistics experts.',
  },
];

export default function Landing() {
  const { lang, currency, platformSettings } = useApp();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const platformName = platformSettings?.platform_name || 'auto Flow';
  const whatsappNumber = platformSettings?.support_whatsapp || WHATSAPP_NUMBER;
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <ScrollToTop />
      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/5 to-violet-500/5 rounded-full blur-3xl" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-5xl mx-auto">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-8"
            >
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              {t(lang, 'hero_badge')}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight leading-none mb-6"
            >
              <span className="text-gray-900 dark:text-white">{t(lang, 'hero_title')}</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
                {t(lang, 'hero_title2')}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              {t(lang, 'hero_sub')}
            </motion.p>

            {/* Primary CTA: Signup (Create Account) + secondary WhatsApp + tertiary Demo */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <button
                onClick={() => navigate('/signup')}
                className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:shadow-indigo-500/60 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                {t(lang, 'hero_cta1')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-900 border border-green-400/60 dark:border-green-600/60 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 font-bold text-lg rounded-2xl transition-all duration-300 hover:-translate-y-0.5 shadow-lg"
              >
                <span className="absolute -top-2 -right-2 flex items-center">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                </span>
                <WhatsAppIcon className="w-5 h-5" />
                {t(lang, 'hero_cta_wa')}
              </a>
              <button
                onClick={() => navigate('/demo')}
                className="group flex items-center gap-3 px-6 py-4 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-lg transition-all duration-300"
              >
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                  <Play className="w-3 h-3 text-indigo-600 fill-indigo-600" />
                </div>
                {t(lang, 'hero_cta2')}
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto"
            >
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t(lang, stat.key)}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.6, duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-3xl rounded-3xl" />
              <div className="relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
                {/* Mock browser bar */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 mx-4 px-4 py-1.5 bg-white dark:bg-gray-900 rounded-lg text-xs text-gray-400 border border-gray-200 dark:border-gray-700">
                    app.autoflow.dz/dashboard
                  </div>
                </div>
                {/* Dashboard content */}
                <div className="p-6 bg-gray-50 dark:bg-gray-950">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total Orders', value: '2,847', change: '+12%', color: 'from-indigo-500 to-violet-500' },
                      { label: 'Revenue', value: '4.2M DZD', change: '+8%', color: 'from-green-500 to-emerald-500' },
                      { label: 'Delivered', value: '2,541', change: '+15%', color: 'from-blue-500 to-cyan-500' },
                      { label: 'Pending', value: '156', change: '-3%', color: 'from-amber-500 to-orange-500' },
                    ].map((card, i) => (
                      <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
                        <div className={`text-xs font-semibold bg-gradient-to-r ${card.color} bg-clip-text text-transparent mb-1`}>{card.label}</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">{card.value}</div>
                        <div className={`text-xs font-medium mt-1 ${card.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{card.change} this week</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Order Volume</span>
                      <span className="text-xs text-gray-400">Last 14 days</span>
                    </div>
                    <div className="flex items-end gap-1 h-20">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72, 100].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-600 to-violet-500 opacity-80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {[
                      { id: '#ORD-2847', customer: 'Karim B.', carrier: 'Yalidine', status: 'Delivered', amount: '4,500 DZD' },
                      { id: '#ORD-2846', customer: 'Sarah M.', carrier: 'ZR Express', status: 'Shipped', amount: '8,200 DZD' },
                      { id: '#ORD-2845', customer: 'Ahmed T.', carrier: 'Noest', status: 'Processing', amount: '2,800 DZD' },
                    ].map((order, i) => (
                      <div key={i} className={`flex items-center justify-between px-4 py-3 text-xs ${i < 2 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
                        <span className="font-mono text-gray-500 dark:text-gray-400">{order.id}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{order.customer}</span>
                        <span className="text-gray-500 dark:text-gray-400">{order.carrier}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          order.status === 'Shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>{order.status}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{order.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">
              {t(lang, 'feat_title')}
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{t(lang, 'feat_sub')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.05}
                className="group bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{t(lang, feat.key1)}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t(lang, feat.key2)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">{t(lang, 'how_title')}</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{t(lang, 'how_sub')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.1}
                className="relative text-center"
              >
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] right-0 h-px bg-gradient-to-r from-indigo-300 to-transparent dark:from-indigo-800" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
                  <span className="text-white font-black text-lg">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t(lang, step.key1)}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{t(lang, step.key2)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-32 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-6">Shipping Partners & Integrations</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400">All your carriers and platforms in one place</p>
          </motion.div>
          <div className="space-y-10">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">Algerian Carriers</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {algerianCarriers.map((c, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.05}
                    className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-300"
                  >
                    <span className="text-2xl">{c.logo}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">International Carriers</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {intlCarriers.map((c, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.05}
                    className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-300"
                  >
                    <span className="text-2xl">{c.logo}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">E-Commerce Platforms</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {platforms.map((c, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.05}
                    className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-300"
                  >
                    <span className="text-2xl">{c.logo}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIP Section */}
      <section id="vip" className="relative py-32 overflow-hidden bg-gradient-to-b from-gray-50 dark:from-gray-950 via-white dark:via-gray-900 to-gray-50 dark:to-gray-950">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 right-10 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 text-white text-sm font-black rounded-full shadow-xl shadow-amber-500/30 mb-6">
              <Crown className="w-4 h-4" />
              <span className="tracking-wide">VIP EXCLUSIVE</span>
              <Crown className="w-4 h-4" />
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 bg-clip-text text-transparent">
                {t(lang, 'vip_title')}
              </span>
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{t(lang, 'vip_sub')}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vipFeatures.map((feat, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.05}
                className="group relative bg-white dark:bg-gray-900 rounded-3xl p-6 border border-amber-200/60 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-x-0 -top-0.5 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                  <feat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{t(lang, feat.key1)}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t(lang, feat.key2)}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="mt-12 flex justify-center"
          >
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:shadow-2xl hover:shadow-amber-500/50 text-white font-bold text-lg rounded-2xl shadow-xl shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Crown className="w-5 h-5" />
              {lang === 'ar' ? 'احصل على VIP الآن' : lang === 'fr' ? 'Obtenir VIP Maintenant' : 'Get VIP Access Now'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">{t(lang, 'pricing_title')}</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400">{t(lang, 'pricing_sub')}</p>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, i) => {
              const isPopular = plan.badge === 'popular';
              const isVip = plan.badge === 'vip';
              const priceLabel = plan.price ? (currency === 'DZD' ? plan.price.DZD : currency === 'USD' ? plan.price.USD : plan.price.EUR) : 'Custom';
              const isFree = plan.price?.DZD === '0';
              return (
                <motion.div
                  key={i}
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.1}
                  className={`relative rounded-3xl p-8 border overflow-hidden flex flex-col ${
                    isVip
                      ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 border-transparent text-white shadow-2xl shadow-amber-500/40 lg:scale-105'
                      : isPopular
                        ? 'bg-gradient-to-b from-indigo-600 to-violet-700 border-transparent text-white shadow-2xl shadow-indigo-500/30'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-amber-400 text-gray-900 text-xs font-black rounded-full shadow-lg">
                      {t(lang, 'pricing_popular')}
                    </div>
                  )}
                  {isVip && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-900 text-amber-300 text-xs font-black rounded-full shadow-lg border border-amber-300/60">
                      {t(lang, 'pricing_vip')}
                    </div>
                  )}
                  {isVip && (
                    <div className="absolute top-5 right-5 flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      {t(lang, 'pricing_save')}
                    </div>
                  )}
                  <h3 className={`text-xl font-black mb-4 ${isPopular || isVip ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {t(lang, plan.key)}
                  </h3>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      {isFree ? (
                        <span className={`text-5xl font-black ${isPopular || isVip ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          {lang === 'ar' ? 'مجاني' : lang === 'fr' ? 'Gratuit' : 'Free'}
                        </span>
                      ) : (
                        <>
                          <span className={`text-5xl font-black ${isPopular || isVip ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {priceLabel}
                          </span>
                          <span className={`text-base font-bold ${
                            isVip ? 'text-amber-100' : isPopular ? 'text-indigo-200' : 'text-gray-500'
                          }`}>{currency}</span>
                        </>
                      )}
                    </div>
                    <div className={`text-sm mt-2 font-semibold ${
                      isVip ? 'text-amber-100' : isPopular ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {plan.durationKey[lang]}
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat, j) => (
                      <li key={j} className={`flex items-start gap-3 text-sm ${
                        isVip ? 'text-white' : isPopular ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          isVip ? 'text-amber-100' : isPopular ? 'text-indigo-200' : 'text-indigo-500'
                        }`} />
                        <span>{feat[lang]}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate('/signup')}
                      className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                        isVip
                          ? 'bg-gray-900 text-amber-300 hover:bg-gray-800 border border-amber-300/40'
                          : isPopular
                            ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      {t(lang, 'pricing_trial')}
                    </button>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 ${
                        isVip
                          ? 'bg-white/15 text-white hover:bg-white/25 border border-white/30'
                          : isPopular
                            ? 'bg-indigo-700/40 text-white hover:bg-indigo-700/60 border border-white/30'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                      }`}
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      {t(lang, 'pricing_wa')}
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-6">{t(lang, 'test_title')}</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400">{t(lang, 'test_sub')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {testimonials.map((test, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.1}
                className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: test.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">"{test.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                    {test.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{test.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{test.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-6">{t(lang, 'faq_title')}</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400">{t(lang, 'faq_sub')}</p>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.05}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="font-bold text-gray-900 dark:text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-12 sm:p-16 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">{t(lang, 'cta_banner_title')}</h2>
              <p className="text-indigo-200 text-lg mb-8">{t(lang, 'cta_banner_sub')}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-indigo-700 font-bold rounded-2xl transition-colors shadow-xl"
                >
                  <Sparkles className="w-5 h-5" />
                  {t(lang, 'hero_cta1')}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors shadow-xl shadow-green-500/40"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  {t(lang, 'cta_banner_btn')}
                </a>
              </div>
              <p className="text-indigo-200 text-xs mt-6 opacity-80 tracking-wider">
                {platformName} · +213 794 157 508
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <PlatformLogo size="md" variant="full" forceTheme="dark" />
              </div>
              <p className="text-sm leading-relaxed mb-6">{t(lang, 'footer_desc')}</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t(lang, 'footer_whatsapp')}
              </a>
            </div>
            {[
              {
                title: t(lang, 'footer_product'),
                links: ['Features', 'Pricing', 'Integrations', 'API Docs', 'Changelog'],
              },
              {
                title: t(lang, 'footer_company'),
                links: ['About', 'Blog', 'Careers', 'Press', 'Partners'],
              },
              {
                title: t(lang, 'footer_support'),
                links: ['Help Center', 'Documentation', 'Status', 'Contact', 'Community'],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-white font-bold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-sm hover:text-indigo-400 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">{t(lang, 'footer_rights')}</p>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-green-400" />
              <Lock className="w-4 h-4 text-green-400" />
              <span>SOC 2 Compliant · GDPR Ready · 99.9% Uptime</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
