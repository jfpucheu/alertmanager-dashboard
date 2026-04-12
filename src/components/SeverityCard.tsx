import { Severity } from '@/types/alertmanager';

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; bg: string; border: string; borderActive: string; text: string; badge: string }
> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-950',
    border: 'border-red-700',
    borderActive: 'border-red-400 ring-1 ring-red-400',
    text: 'text-red-400',
    badge: 'bg-red-700 text-red-100',
  },
  error: {
    label: 'Error',
    bg: 'bg-orange-950',
    border: 'border-orange-700',
    borderActive: 'border-orange-400 ring-1 ring-orange-400',
    text: 'text-orange-400',
    badge: 'bg-orange-700 text-orange-100',
  },
  warning: {
    label: 'Warning',
    bg: 'bg-yellow-950',
    border: 'border-yellow-700',
    borderActive: 'border-yellow-400 ring-1 ring-yellow-400',
    text: 'text-yellow-400',
    badge: 'bg-yellow-700 text-yellow-100',
  },
  info: {
    label: 'Info',
    bg: 'bg-blue-950',
    border: 'border-blue-700',
    borderActive: 'border-blue-400 ring-1 ring-blue-400',
    text: 'text-blue-400',
    badge: 'bg-blue-700 text-blue-100',
  },
  none: {
    label: 'None',
    bg: 'bg-gray-800',
    border: 'border-gray-600',
    borderActive: 'border-gray-400 ring-1 ring-gray-400',
    text: 'text-gray-400',
    badge: 'bg-gray-600 text-gray-100',
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
        isClickable ? 'cursor-pointer hover:brightness-110 select-none' : '',
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
