'use client';

import { useEffect, useState, useCallback } from 'react';
import SeverityCard from '@/components/SeverityCard';
import SilenceModal from '@/components/SilenceModal';
import { AlertManagerStatus, SeverityCounts, Severity, SEVERITIES, AlertManager, Alert } from '@/types/alertmanager';
import { getSeverity } from '@/lib/severity';

const EMPTY_COUNTS: SeverityCounts = { critical: 0, error: 0, warning: 0, info: 0, none: 0 };

interface FlatAlert {
  alert: Alert;
  amName: string;
  amId: string;
  am: AlertManager;
}

export default function HomePage() {
  const [data, setData] = useState<AlertManagerStatus[]>([]);
  const [alertManagers, setAlertManagers] = useState<AlertManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showSilence, setShowSilence] = useState(false);
  const [silenceAlert, setSilenceAlert] = useState<{ am: AlertManager; alert: Alert } | null>(null);
  const [expandedSeverity, setExpandedSeverity] = useState<Severity | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, amsRes] = await Promise.all([fetch('/api/alerts'), fetch('/api/alertmanagers')]);
      setData(await alertsRes.json());
      setAlertManagers(await amsRes.json());
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totals = data.reduce<SeverityCounts>(
    (acc, am) => { for (const s of SEVERITIES) acc[s] += am.severityCounts[s]; return acc; },
    { ...EMPTY_COUNTS }
  );

  const allAlerts: FlatAlert[] = data.flatMap((item) =>
    item.alerts.map((alert) => ({ alert, amName: item.alertManager.name, amId: item.alertManager.id, am: item.alertManager }))
  );

  const filteredAlerts = expandedSeverity ? allAlerts.filter((fa) => getSeverity(fa.alert) === expandedSeverity) : [];
  const totalAlerts = SEVERITIES.reduce((sum, s) => sum + totals[s], 0);
  const reachableCount = data.filter((d) => d.reachable).length;

  function toggleSeverity(s: Severity) {
    setExpandedSeverity((prev) => (prev === s ? null : s));
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-white text-2xl font-bold">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {reachableCount}/{data.length} AlertManagers reachable
            {lastRefresh && (
              <span className="ml-3 text-gray-400 dark:text-gray-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSilence(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg">
            + Create Silence
          </button>
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Total */}
      {data.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Total active alerts:</span>
          <span className="text-gray-900 dark:text-white text-2xl font-bold">{totalAlerts}</span>
          <span className="text-gray-400 dark:text-gray-500 text-sm">
            across {data.length} AlertManager{data.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Severity blocks */}
      {data.length === 0 && !loading ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No AlertManagers configured.</p>
          <p className="text-sm mt-1">
            Go to{' '}
            <a href="/alertmanagers" className="text-blue-500 hover:underline">AlertManagers</a>{' '}
            to add one.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            {SEVERITIES.map((severity) => (
              <SeverityCard
                key={severity}
                severity={severity as Severity}
                count={totals[severity]}
                active={expandedSeverity === severity}
                onClick={() => toggleSeverity(severity as Severity)}
              />
            ))}
          </div>

          {expandedSeverity && (
            <AlertsTable
              severity={expandedSeverity}
              alerts={filteredAlerts}
              onSilence={(fa) => setSilenceAlert({ am: fa.am, alert: fa.alert })}
            />
          )}
        </>
      )}

      {/* Per-AM status */}
      {data.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-gray-500 dark:text-gray-300 text-sm font-semibold uppercase tracking-wider">Par AlertManager</h2>
          <div className="grid grid-cols-1 gap-2">
            {data.map((am) => (
              <div key={am.alertManager.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${am.reachable ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-900 dark:text-white font-medium text-sm">{am.alertManager.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">{am.alertManager.url}</span>
                </div>
                {am.reachable ? (
                  <div className="flex gap-2">
                    {SEVERITIES.map((s) => am.severityCounts[s] > 0 ? <SeverityBadge key={s} severity={s} count={am.severityCounts[s]} /> : null)}
                    {SEVERITIES.every((s) => am.severityCounts[s] === 0) && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">No active alerts</span>
                    )}
                  </div>
                ) : (
                  <span className="text-red-500 text-xs">Unreachable: {am.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showSilence && <SilenceModal alertManagers={alertManagers} onClose={() => setShowSilence(false)} onSuccess={fetchData} />}
      {silenceAlert && <SilenceModal alertManagers={alertManagers} preselectedAM={silenceAlert.am} preselectedAlert={silenceAlert.alert} onClose={() => setSilenceAlert(null)} onSuccess={fetchData} />}
    </div>
  );
}

// ── AlertsTable ────────────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<Severity, { border: string; label: string }> = {
  critical: { border: 'border-red-500 dark:border-red-600',       label: 'text-red-600 dark:text-red-400' },
  error:    { border: 'border-orange-500 dark:border-orange-600', label: 'text-orange-600 dark:text-orange-400' },
  warning:  { border: 'border-yellow-500 dark:border-yellow-500', label: 'text-yellow-600 dark:text-yellow-400' },
  info:     { border: 'border-blue-500 dark:border-blue-500',     label: 'text-blue-600 dark:text-blue-400' },
  none:     { border: 'border-gray-400 dark:border-gray-500',     label: 'text-gray-500 dark:text-gray-400' },
};

function AlertsTable({ severity, alerts, onSilence }: { severity: Severity; alerts: FlatAlert[]; onSilence: (fa: FlatAlert) => void }) {
  const { border, label } = SEVERITY_BORDER[severity];
  return (
    <div className={`bg-white dark:bg-gray-800 border-2 ${border} rounded-xl overflow-hidden`}>
      <div className={`bg-gray-50 dark:bg-gray-900 border-b-2 ${border} px-4 py-2 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full bg-current ${label}`} />
        <span className={`text-xs font-semibold uppercase tracking-widest ${label}`}>{severity}</span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">— {alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <th className="text-left px-4 py-2 font-medium">Alert</th>
            <th className="text-left px-4 py-2 font-medium">AlertManager</th>
            <th className="text-left px-4 py-2 font-medium">Instance</th>
            <th className="text-left px-4 py-2 font-medium">Since</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {alerts.map((fa) => (
            <tr key={`${fa.amId}-${fa.alert.fingerprint}`} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-2 text-gray-900 dark:text-white">{fa.alert.labels.alertname ?? '—'}</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{fa.amName}</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{fa.alert.labels.instance ?? fa.alert.labels.job ?? '—'}</td>
              <td className="px-4 py-2 text-gray-400 dark:text-gray-500">{new Date(fa.alert.startsAt).toLocaleString()}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => onSilence(fa)} className="text-orange-500 hover:text-orange-400 text-xs border border-orange-300 dark:border-orange-900 hover:border-orange-400 dark:hover:border-orange-700 px-2 py-0.5 rounded">
                  Silence
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeverityBadge({ severity, count }: { severity: Severity; count: number }) {
  const colors: Record<Severity, string> = {
    critical: 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200',
    error:    'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200',
    warning:  'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200',
    info:     'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200',
    none:     'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[severity]}`}>
      {severity}: {count}
    </span>
  );
}
