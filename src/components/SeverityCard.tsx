import { Severity } from '@/types/alertmanager';

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; bg: string; border: string; borderActive: string; text: string }
> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-700',
    borderActive: 'border-red-500 dark:border-red-400 ring-1 ring-red-500 dark:ring-red-400',
    text: 'text-red-600 dark:text-red-400',
  },
  error: {
    label: 'Error',
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-700',
    borderActive: 'border-orange-500 dark:border-orange-400 ring-1 ring-orange-500 dark:ring-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
  },
  warning: {
    label: 'Warning',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-700',
    borderActive: 'border-yellow-500 dark:border-yellow-400 ring-1 ring-yellow-500 dark:ring-yellow-400',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    label: 'Info',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-700',
    borderActive: 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400',
    text: 'text-blue-600 dark:text-blue-400',
  },
  none: {
    label: 'None',
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    borderActive: 'border-gray-500 dark:border-gray-400 ring-1 ring-gray-500 dark:ring-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
  },
};

interface SeverityCardProps {
  severity: Severity;
  count: number;
  active?: boolean;
  onClick?: () => void;
}

export default function SeverityCard({ severity, count, active, onClick }: SeverityCardProps) {
  const config = SEVERITY_CONFIG[severity];
  const isClickable = onClick && count > 0;
  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={[
        'rounded-xl border p-6 flex flex-col items-center gap-3 transition-all',
        config.bg,
        active ? config.borderActive : config.border,
        isClickable ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 select-none' : '',
        !isClickable && count === 0 ? 'opacity-40' : '',
      ].join(' ')}
    >
      <span className={`text-sm font-semibold uppercase tracking-widest ${config.text}`}>
        {config.label}
      </span>
      <span className={`text-5xl font-bold ${config.text}`}>{count}</span>
      {isClickable && (
        <span className={`text-xs ${config.text} opacity-60`}>
          {active ? '▲ fermer' : '▼ voir'}
        </span>
      )}
    </div>
  );
}

export { SEVERITY_CONFIG };
