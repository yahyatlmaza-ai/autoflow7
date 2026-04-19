/**
 * Maps API error codes to humanized messages in EN / FR / AR.
 *
 * Unknown codes fall back to the raw `message` the backend sent (or a
 * localized generic).  Field-level validation errors are returned separately
 * by humanizeFields() so forms can show them inline.
 */
import type { Language } from './i18n';
import { ApiError } from './api';

type Dict = Record<string, { en: string; fr: string; ar: string }>;

const MESSAGES: Dict = {
  NETWORK_ERROR: {
    en: 'Network error. Please check your connection and try again.',
    fr: "Erreur réseau. Vérifiez votre connexion et réessayez.",
    ar: 'خطأ في الشبكة. تحقق من اتصالك وحاول مرة أخرى.',
  },
  SERVER_ERROR: {
    en: 'Something went wrong on our side. Please try again in a moment.',
    fr: "Une erreur est survenue. Veuillez réessayer dans un instant.",
    ar: 'حدث خطأ لدينا. يرجى المحاولة بعد قليل.',
  },
  UNAUTHORIZED: {
    en: 'Your session has expired. Please sign in again.',
    fr: 'Votre session a expiré. Veuillez vous reconnecter.',
    ar: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
  },
  FORBIDDEN: {
    en: "You don't have permission to do that.",
    fr: "Vous n'avez pas la permission de faire cela.",
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  },
  NOT_FOUND: {
    en: 'The item you are looking for was not found.',
    fr: "L'élément demandé est introuvable.",
    ar: 'العنصر المطلوب غير موجود.',
  },
  VALIDATION_ERROR: {
    en: 'Please check the highlighted fields and try again.',
    fr: 'Veuillez corriger les champs indiqués et réessayer.',
    ar: 'يرجى مراجعة الحقول المشار إليها والمحاولة مرة أخرى.',
  },
  EMAIL_EXISTS: {
    en: 'An account with this email already exists. Try signing in instead.',
    fr: 'Un compte avec cet e-mail existe déjà. Essayez de vous connecter.',
    ar: 'هناك حساب بهذا البريد الإلكتروني بالفعل. جرب تسجيل الدخول.',
  },
  INVALID_CREDENTIALS: {
    en: 'Incorrect email or password.',
    fr: 'E-mail ou mot de passe incorrect.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  },
  INVALID_TRANSITION: {
    en: 'This status change is not allowed for the order.',
    fr: "Ce changement de statut n'est pas autorisé.",
    ar: 'لا يسمح بهذا التغيير في حالة الطلب.',
  },
  INVALID_STATUS: {
    en: 'Unknown order status.',
    fr: 'Statut de commande inconnu.',
    ar: 'حالة طلب غير معروفة.',
  },
  INVALID_CUSTOMER: {
    en: "This customer doesn't belong to your workspace.",
    fr: "Ce client n'appartient pas à votre espace.",
    ar: 'هذا العميل لا ينتمي إلى مساحة عملك.',
  },
  INVALID_AGENT: {
    en: "This delivery agent doesn't belong to your workspace.",
    fr: "Ce livreur n'appartient pas à votre espace.",
    ar: 'هذا المندوب لا ينتمي إلى مساحة عملك.',
  },
  INVALID_PLAN: {
    en: 'This plan is not available.',
    fr: "Ce plan n'est pas disponible.",
    ar: 'هذه الخطة غير متاحة.',
  },
  TRIAL_EXPIRED: {
    en: 'Your free trial has ended. Please upgrade your plan to continue.',
    fr: "Votre essai gratuit est terminé. Veuillez mettre à niveau votre plan.",
    ar: 'انتهت فترة التجربة المجانية. يرجى ترقية خطتك للمتابعة.',
  },
  TENANT_NOT_FOUND: {
    en: 'Workspace not found.',
    fr: 'Espace introuvable.',
    ar: 'مساحة العمل غير موجودة.',
  },
  CONFLICT: {
    en: 'This action conflicts with existing data.',
    fr: "Cette action entre en conflit avec les données existantes.",
    ar: 'هذا الإجراء يتعارض مع البيانات الموجودة.',
  },
};

const FIELD_LABELS: Record<string, { en: string; fr: string; ar: string }> = {
  email: { en: 'email', fr: 'e-mail', ar: 'البريد الإلكتروني' },
  password: { en: 'password', fr: 'mot de passe', ar: 'كلمة المرور' },
  full_name: { en: 'name', fr: 'nom', ar: 'الاسم' },
  company_name: { en: 'company', fr: 'entreprise', ar: 'الشركة' },
  phone: { en: 'phone', fr: 'téléphone', ar: 'الهاتف' },
};

export function humanizeError(err: unknown, lang: Language): string {
  if (err instanceof ApiError) {
    const entry = MESSAGES[err.code];
    if (entry) return entry[lang] || entry.en;
    return err.message || MESSAGES.SERVER_ERROR[lang];
  }
  if (err instanceof Error) return err.message;
  return MESSAGES.SERVER_ERROR[lang];
}

export function humanizeFields(err: unknown, lang: Language): Record<string, string> {
  if (!(err instanceof ApiError) || !err.fields) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(err.fields)) {
    const label = FIELD_LABELS[k]?.[lang] || k;
    out[k] = `${label}: ${v}`;
  }
  return out;
}
