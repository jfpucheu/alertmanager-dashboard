import { Severity } from '@/types/alertmanager';

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; bg: string; border: string; text: string; badge: string }
> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-950',
    border: 'border-red-700',
    text: 'text-red-400',
    badge: 'bg-red-700 text-red-100',
  },
  error: {
    label: 'Error',
    bg: 'bg-orange-950',
    border: 'border-orange-700',
    text: 'text-orange-400',
    badge: 'bg-orange-700 text-orange-100',
  },
  warning: {
    label: 'Warning',
    bg: 'bg-yellow-950',
    border: 'border-yellow-700',
    text: 'text-yellow-400',
    badge: 'bg-yellow-700 text-yellow-100',
  },
  info: {
    label: 'Info',
    bg: 'bg-blue-950',
    border: 'border-blue-700',
    text: 'text-blue-400',
    badge: 'bg-blue-700 text-blue-100',
  },
  none: {
    label: 'None',
    bg: 'bg-gray-800',
    border: 'border-gray-600',
    text: 'text-gray-400',
    badge: 'bg-gray-600 text-gray-100',
  },
};

interface SeverityCardProps {
  severity: Severity;
  count: number;
}

export default function SeverityCard({ severity, count }: SeverityCardProps) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <div
      className={`rounded-xl border ${config.bg} ${config.border} p-6 flex flex-col items-center gap-3`}
    >
      <span className={`text-sm font-semibold uppercase tracking-widest ${config.text}`}>
        {config.label}
      </span>
      <span className={`text-5xl font-bold ${config.text}`}>{count}</span>
    </div>
  );
}

export { SEVERITY_CONFIG };
