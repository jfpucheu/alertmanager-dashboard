'use client';

import { useEffect, useState, useCallback } from 'react';
import SeverityCard from '@/components/SeverityCard';
import SilenceModal from '@/components/SilenceModal';
import { AlertManagerStatus, SeverityCounts, Severity, SEVERITIES, AlertManager, Alert, AssignmentMap, AMSilences, Silence } from '@/types/alertmanager';
import { getSeverity } from '@/lib/severity';
import AssignCell from '@/components/AssignCell';

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
  const [expandedSeverities, setExpandedSeverities] = useState<Set<Severity>>(new Set());
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [selectedAmId, setSelectedAmId] = useState<string>('');
  const [alertnameFilter, setAlertnameFilter] = useState('');
  const [silencesData, setSilencesData] = useState<AMSilences[]>([]);
  const [showSilencesTable, setShowSilencesTable] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, amsRes, assignRes, silencesRes] = await Promise.all([fetch('/api/alerts'), fetch('/api/alertmanagers'), fetch('/api/assignments'), fetch('/api/silences')]);
      setData(await alertsRes.json());
      setAlertManagers(await amsRes.json());
      setAssignments(await assignRes.json());
      setSilencesData(await silencesRes.json());
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

  const filteredData = selectedAmId ? data.filter((d) => d.alertManager.id === selectedAmId) : data;

  const totals = filteredData.reduce<SeverityCounts>(
    (acc, am) => { for (const s of SEVERITIES) acc[s] += am.severityCounts[s]; return acc; },
    { ...EMPTY_COUNTS }
  );

  const allAlerts: FlatAlert[] = filteredData.flatMap((item) =>
    item.alerts.map((alert) => ({ alert, amName: item.alertManager.name, amId: item.alertManager.id, am: item.alertManager }))
  ).filter((fa) => !alertnameFilter || (fa.alert.labels.alertname ?? '').toLowerCase().includes(alertnameFilter.toLowerCase()));

  const totalAlerts = SEVERITIES.reduce((sum, s) => sum + totals[s], 0);

  const filteredSilences = (selectedAmId
    ? silencesData.filter((s) => s.alertManager.id === selectedAmId)
    : silencesData
  ).flatMap((s) => s.silences.map((silence) => ({ silence, amName: s.alertManager.name })));
  const totalSilences = filteredSilences.length;
  const reachableCount = data.filter((d) => d.reachable).length;

  function toggleSeverity(s: Severity) {
    setExpandedSeverities((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
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
        <div className="flex items-center gap-3">
          {data.length > 1 && (
            <select
              value={selectedAmId}
              onChange={(e) => setSelectedAmId(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les AlertManagers</option>
              {data.map((d) => (
                <option key={d.alertManager.id} value={d.alertManager.id}>
                  {d.alertManager.name}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <input
              type="search"
              value={alertnameFilter}
              onChange={(e) => setAlertnameFilter(e.target.value)}
              placeholder="Filtrer par alertname…"
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
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
            {selectedAmId
              ? `sur ${data.find((d) => d.alertManager.id === selectedAmId)?.alertManager.name}`
              : `sur ${data.length} AlertManager${data.length > 1 ? 's' : ''}`}
          </span>
          <span className="ml-4 text-gray-400 dark:text-gray-600">|</span>
          <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">Silences actifs :</span>
          <span className="text-purple-600 dark:text-purple-400 text-2xl font-bold">{totalSilences}</span>
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
          <div className="grid grid-cols-6 gap-4">
            {SEVERITIES.map((severity) => (
              <SeverityCard
                key={severity}
                severity={severity as Severity}
                count={totals[severity]}
                active={expandedSeverities.has(severity as Severity)}
                onClick={() => toggleSeverity(severity as Severity)}
              />
            ))}
            {/* Silences card */}
            <div
              onClick={() => totalSilences > 0 && setShowSilencesTable((v) => !v)}
              className={[
                'rounded-xl border p-6 flex flex-col items-center gap-3 transition-all',
                'bg-purple-50 dark:bg-purple-950',
                showSilencesTable
                  ? 'border-purple-500 dark:border-purple-400 ring-1 ring-purple-500 dark:ring-purple-400'
                  : 'border-purple-200 dark:border-purple-700',
                totalSilences > 0 ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 select-none' : 'opacity-40',
              ].join(' ')}
            >
              <span className="text-sm font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">Silences</span>
              <span className="text-5xl font-bold text-purple-600 dark:text-purple-400">{totalSilences}</span>
              {totalSilences > 0 && (
                <span className="text-xs text-purple-600 dark:text-purple-400 opacity-60">
                  {showSilencesTable ? '▲ fermer' : '▼ voir'}
                </span>
              )}
            </div>
          </div>

          {showSilencesTable && totalSilences > 0 && (
            <SilencesTable silences={filteredSilences} />
          )}

          {SEVERITIES.filter((s) => expandedSeverities.has(s as Severity)).map((severity) => (
            <AlertsTable
              key={severity}
              severity={severity as Severity}
              alerts={allAlerts.filter((fa) => getSeverity(fa.alert) === severity)}
              assignments={assignments}
              onSilence={(fa) => setSilenceAlert({ am: fa.am, alert: fa.alert })}
              onAssignmentChanged={fetchData}
            />
          ))}
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

function AlertsTable({
  severity, alerts, assignments, onSilence, onAssignmentChanged,
}: {
  severity: Severity;
  alerts: FlatAlert[];
  assignments: AssignmentMap;
  onSilence: (fa: FlatAlert) => void;
  onAssignmentChanged: () => void;
}) {
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
            <th className="text-left px-4 py-2 font-medium">Affecté</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {alerts.map((fa) => {
            const key = `${fa.amId}::${fa.alert.fingerprint}`;
            return (
              <tr key={key} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-2 text-gray-900 dark:text-white">{fa.alert.labels.alertname ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{fa.amName}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{fa.alert.labels.instance ?? fa.alert.labels.job ?? '—'}</td>
                <td className="px-4 py-2 text-gray-400 dark:text-gray-500">{new Date(fa.alert.startsAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <AssignCell amId={fa.amId} fingerprint={fa.alert.fingerprint} assignment={assignments[key]} onChanged={onAssignmentChanged} />
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => onSilence(fa)} className="text-orange-500 hover:text-orange-400 text-xs border border-orange-300 dark:border-orange-900 hover:border-orange-400 dark:hover:border-orange-700 px-2 py-0.5 rounded">
                    Silence
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── SilencesTable ──────────────────────────────────────────────────────────

function SilencesTable({ silences }: { silences: { silence: Silence; amName: string }[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-600 rounded-xl overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-900 border-b-2 border-purple-500 dark:border-purple-600 px-4 py-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        <span className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">Silences actifs</span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">— {silences.length} silence{silences.length !== 1 ? 's' : ''}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            <th className="text-left px-4 py-2 font-medium">Commentaire</th>
            <th className="text-left px-4 py-2 font-medium">AlertManager</th>
            <th className="text-left px-4 py-2 font-medium">Créé par</th>
            <th className="text-left px-4 py-2 font-medium">Matchers</th>
            <th className="text-left px-4 py-2 font-medium">Début</th>
            <th className="text-left px-4 py-2 font-medium">Fin</th>
          </tr>
        </thead>
        <tbody>
          {silences.map(({ silence, amName }) => (
            <tr key={silence.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-2 text-gray-900 dark:text-white max-w-[200px] truncate" title={silence.comment}>{silence.comment || '—'}</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{amName}</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{silence.createdBy}</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {silence.matchers.map((m, i) => (
                    <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">
                      {m.name}{m.isEqual ? (m.isRegex ? '=~' : '=') : (m.isRegex ? '!~' : '!=')}&quot;{m.value}&quot;
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2 text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(silence.startsAt).toLocaleString()}</td>
              <td className="px-4 py-2 text-gray-400 dark:text-gray-500 whitespace-nowrap">{new Date(silence.endsAt).toLocaleString()}</td>
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
