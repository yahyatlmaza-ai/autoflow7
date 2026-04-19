export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency: string): string {
  if (!amount && amount !== 0) return '-';
  switch (currency) {
    case 'USD': return `$${(amount / 134).toFixed(2)}`;
    case 'EUR': return `€${(amount / 145).toFixed(2)}`;
    default: return `${amount.toLocaleString('fr-DZ')} DZD`;
  }
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatRelative(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function generateOrderNumber(): string {
  return '#ORD-' + Date.now().toString().slice(-6);
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:          { label: 'Pending',          color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30',   dot: 'bg-amber-500' },
  confirmed:        { label: 'Confirmed',         color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/30',     dot: 'bg-blue-500' },
  processing:       { label: 'Processing',        color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', dot: 'bg-indigo-500' },
  shipped:          { label: 'Shipped',           color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', dot: 'bg-purple-500' },
  out_for_delivery: { label: 'Out for Delivery',  color: 'text-cyan-700 dark:text-cyan-400',     bg: 'bg-cyan-100 dark:bg-cyan-900/30',     dot: 'bg-cyan-500' },
  delivered:        { label: 'Delivered',         color: 'text-green-700 dark:text-green-400',   bg: 'bg-green-100 dark:bg-green-900/30',   dot: 'bg-green-500' },
  returned:         { label: 'Returned',          color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', dot: 'bg-orange-500' },
  cancelled:        { label: 'Cancelled',         color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-900/30',       dot: 'bg-red-500' },
};

export const CARRIERS = ['Yalidine', 'ZR Express', 'Noest', 'Amana', 'EMS Algeria', 'DHL', 'FedEx', 'UPS', 'Aramex'];
export const PLATFORMS = ['Shopify', 'WooCommerce', 'Magento', 'OpenCart', 'Custom API'];
export const WILAYAS = ['Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem','M\'Sila','Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent','Ghardaïa','Relizane'];
