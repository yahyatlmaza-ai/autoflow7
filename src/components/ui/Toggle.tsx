import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, description, size = 'md', disabled }: ToggleProps) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'translate-x-7' },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!checked)}>
      <div className={`relative ${s.track} rounded-full transition-colors duration-300 flex-shrink-0 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}>
        <motion.div
          animate={{ x: checked ? (size === 'sm' ? 16 : size === 'md' ? 20 : 28) : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-1/2 -translate-y-1/2 ${s.thumb} bg-white rounded-full shadow-md`}
          style={{ left: 0 }}
        />
      </div>
      {(label || description) && (
        <div>
          {label && <div className="text-sm font-semibold text-gray-900 dark:text-white">{label}</div>}
          {description && <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>}
        </div>
      )}
    </div>
  );
}
