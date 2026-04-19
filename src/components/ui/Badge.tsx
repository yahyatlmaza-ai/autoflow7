import { STATUS_META } from '../../lib/utils';

interface BadgeProps {
  status: string;
  size?: 'xs' | 'sm';
}

export default function Badge({ status, size = 'sm' }: BadgeProps) {
  const meta = STATUS_META[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${
      size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    } ${meta.bg} ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
