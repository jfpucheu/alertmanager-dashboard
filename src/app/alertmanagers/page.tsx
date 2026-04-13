'use client';

import { useEffect, useState, useCallback } from 'react';
import AddAlertManagerModal from '@/components/AddAlertManagerModal';
import SilenceModal from '@/components/SilenceModal';
import { AlertManagerStatus, AlertManager, Alert, Severity, SEVERITIES, AssignmentMap } from '@/types/alertmanager';
import AssignCell from '@/components/AssignCell';

function ProxyBadge({ am }: { am: AlertManager }) {
  if (am.noProxy) {
    return <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded" title="No proxy">no proxy</span>;
  }
  if (am.proxy) {
    return <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded" title={`Custom proxy: ${am.proxy}`}>proxy: {new URL(am.proxy).host}</span>;
  }
  return null;
}

function InsecureBadge({ am }: { am: AlertManager }) {
  if (!am.insecure) return null;
  return (
    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded" title="TLS certificate errors ignored">
      TLS non vérifié
    </span>
  );
}

export default function AlertManagersPage() {
  const [data, setData] = useState<AlertManagerStatus[]>([]);
  const [alertManagers, setAlertManagers] = useState<AlertManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [silenceContext, setSilenceContext] = useState<{
    am?: AlertManager;
    alert?: Alert;
    silenceAll?: boolean;
  } | null>(null);
  const [expandedAM, setExpandedAM] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentMap>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, amsRes, assignRes] = await Promise.all([fetch('/api/alerts'), fetch('/api/alertmanagers'), fetch('/api/assignments')]);
      setData(await alertsRes.json());
      setAlertManagers(await amsRes.json());
      setAssignments(await assignRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm('Remove this AlertManager?')) return;
    await fetch(`/api/alertmanagers?id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  return (
    <div className="flex-1 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-gray-900 dark:text-white text-2xl font-bold">AlertManagers</h1>
        <div className="flex gap-3">
          <button onClick={() => setSilenceContext({})} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg">
            + Create Silence
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg">
            + Add AlertManager
          </button>
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {data.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No AlertManagers added yet.</p>
          <p className="text-sm mt-1">Click &ldquo;+ Add AlertManager&rdquo; to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.alertManager.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.reachable ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white font-semibold">{item.alertManager.name}</span>
                    {!item.reachable && (
                      <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-2 py-0.5 rounded">Unreachable</span>
                    )}
                    <ProxyBadge am={item.alertManager} />
                    <InsecureBadge am={item.alertManager} />
                  </div>
                  <a href={item.alertManager.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-xs truncate block hover:underline">
                    {item.alertManager.url}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {item.reachable && (
                  <div className="flex gap-1.5">
                    {SEVERITIES.map((s) => (
                      <SeverityBadge key={s} severity={s} count={item.severityCounts[s]} />
                    ))}
                  </div>
                )}
                <div className="flex gap-2 ml-2">
                  {item.reachable && item.alerts.length > 0 && (
                    <button
                      onClick={() => setExpandedAM(expandedAM === item.alertManager.id ? null : item.alertManager.id)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 px-2 py-1 rounded"
                    >
                      {expandedAM === item.alertManager.id ? 'Hide alerts' : `View ${item.alerts.length} alert${item.alerts.length > 1 ? 's' : ''}`}
                    </button>
                  )}
                  {item.reachable && item.alerts.length > 0 && (
                    <button onClick={() => setSilenceContext({ am: item.alertManager, silenceAll: true })} className="text-xs text-orange-500 hover:text-orange-400 border border-orange-300 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 px-2 py-1 rounded">
                      Silence all
                    </button>
                  )}
                  <button onClick={() => setSilenceContext({ am: item.alertManager })} className="text-xs text-orange-500 hover:text-orange-400 border border-orange-300 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 px-2 py-1 rounded">
                    Silence
                  </button>
                  <button onClick={() => handleDelete(item.alertManager.id)} className="text-xs text-red-500 hover:text-red-400 border border-red-200 dark:border-red-900 hover:border-red-400 dark:hover:border-red-700 px-2 py-1 rounded">
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {expandedAM === item.alertManager.id && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                      <th className="text-left px-4 py-2 font-medium">Alert</th>
                      <th className="text-left px-4 py-2 font-medium">Severity</th>
                      <th className="text-left px-4 py-2 font-medium">Instance</th>
                      <th className="text-left px-4 py-2 font-medium">Since</th>
                      <th className="text-left px-4 py-2 font-medium">Affecté</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {item.alerts.map((alert) => (
                      <AlertRow
                        key={alert.fingerprint}
                        alert={alert}
                        amId={item.alertManager.id}
                        assignments={assignments}
                        onSilence={() => setSilenceContext({ am: item.alertManager, alert })}
                        onAssignmentChanged={fetchData}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && <AddAlertManagerModal onClose={() => setShowAdd(false)} onAdded={fetchData} />}
      {silenceContext !== null && (
        <SilenceModal
          alertManagers={alertManagers}
          preselectedAM={silenceContext.am}
          preselectedAlert={silenceContext.alert}
          preselectedMatchers={silenceContext.silenceAll
            ? [{ name: 'alertname', value: '.+', isRegex: true, isEqual: true }]
            : undefined
          }
          onClose={() => setSilenceContext(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

function SeverityBadge({ severity, count }: { severity: Severity; count: number }) {
  const colors: Record<Severity, string> = {
    critical: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300',
    error:    'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300',
    warning:  'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
    info:     'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    none:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[severity]} ${count === 0 ? 'opacity-30' : ''}`}>
      {severity[0].toUpperCase()}: {count}
    </span>
  );
}

function AlertRow({ alert, amId, assignments, onSilence, onAssignmentChanged }: {
  alert: Alert;
  amId: string;
  assignments: AssignmentMap;
  onSilence: () => void;
  onAssignmentChanged: () => void;
}) {
  const severity = (alert.labels.severity ?? 'none').toLowerCase();
  const severityColors: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400',
    error:    'text-orange-600 dark:text-orange-400',
    warning:  'text-yellow-600 dark:text-yellow-400',
    info:     'text-blue-600 dark:text-blue-400',
    none:     'text-gray-500 dark:text-gray-400',
  };
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
      <td className="px-4 py-2 text-gray-900 dark:text-white">{alert.labels.alertname ?? '—'}</td>
      <td className={`px-4 py-2 font-semibold ${severityColors[severity] ?? severityColors.none}`}>{severity}</td>
      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{alert.labels.instance ?? alert.labels.job ?? '—'}</td>
      <td className="px-4 py-2 text-gray-400 dark:text-gray-500">{new Date(alert.startsAt).toLocaleString()}</td>
      <td className="px-4 py-2">
        <AssignCell amId={amId} fingerprint={alert.fingerprint} assignment={assignments[`${amId}::${alert.fingerprint}`]} onChanged={onAssignmentChanged} />
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={onSilence} className="text-orange-500 hover:text-orange-400 text-xs border border-orange-300 dark:border-orange-900 hover:border-orange-400 dark:hover:border-orange-700 px-2 py-0.5 rounded">
          Silence
        </button>
      </td>
    </tr>
  );
}
