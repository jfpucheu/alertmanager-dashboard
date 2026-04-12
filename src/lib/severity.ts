import { Alert, SeverityCounts } from '@/types/alertmanager';

export function getSeverity(alert: Alert): keyof SeverityCounts {
  const s = (alert.labels.severity ?? '').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'error') return 'error';
  if (s === 'warning') return 'warning';
  if (s === 'info' || s === 'information' || s === 'informing') return 'info';
  return 'none';
}

export function countBySeverity(alerts: Alert[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, error: 0, warning: 0, info: 0, none: 0 };
  for (const alert of alerts) {
    counts[getSeverity(alert)]++;
  }
  return counts;
}
