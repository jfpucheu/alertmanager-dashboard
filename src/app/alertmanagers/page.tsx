'use client';

import { useEffect, useState, useCallback } from 'react';
import AddAlertManagerModal from '@/components/AddAlertManagerModal';
import SilenceModal from '@/components/SilenceModal';
import { AlertManagerStatus, AlertManager, Alert, Severity, SEVERITIES } from '@/types/alertmanager';

export default function AlertManagersPage() {
  const [data, setData] = useState<AlertManagerStatus[]>([]);
  const [alertManagers, setAlertManagers] = useState<AlertManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [silenceContext, setSilenceContext] = useState<{
    am?: AlertManager;
    alert?: Alert;
  } | null>(null);
  const [expandedAM, setExpandedAM] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, amsRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/alertmanagers'),
      ]);
      setData(await alertsRes.json());
      setAlertManagers(await amsRes.json());
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">AlertManagers</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setSilenceContext({})}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg"
          >
            + Create Silence
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg"
          >
            + Add AlertManager
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {data.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No AlertManagers added yet.</p>
          <p className="text-sm mt-1">Click &ldquo;+ Add AlertManager&rdquo; to get started.</p>
        </div>
      )}

      {/* AlertManager list */}
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.alertManager.id}
            className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
          >
            {/* AM header row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.reachable ? 'bg-green-400' : 'bg-red-500'}`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{item.alertManager.name}</span>
                    {!item.reachable && (
                      <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">
                        Unreachable
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs truncate block">{item.alertManager.url}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Severity badges (small) */}
                {item.reachable && (
                  <div className="flex gap-1.5">
                    {SEVERITIES.map((s) => (
                      <SeverityBadge key={s} severity={s} count={item.severityCounts[s]} />
                    ))}
                  </div>
                )}
                {item.reachable && !item.reachable && (
                  <span className="text-red-400 text-xs">{item.error}</span>
                )}

                {/* Actions */}
                <div className="flex gap-2 ml-2">
                  {item.reachable && item.alerts.length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedAM(expandedAM === item.alertManager.id ? null : item.alertManager.id)
                      }
                      className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 px-2 py-1 rounded"
                    >
                      {expandedAM === item.alertManager.id ? 'Hide alerts' : `View ${item.alerts.length} alert${item.alerts.length > 1 ? 's' : ''}`}
                    </button>
                  )}
                  <button
                    onClick={() => setSilenceContext({ am: item.alertManager })}
                    className="text-xs text-orange-400 hover:text-orange-300 border border-orange-800 hover:border-orange-600 px-2 py-1 rounded"
                  >
                    Silence
                  </button>
                  <button
                    onClick={() => handleDelete(item.alertManager.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Alerts table (expandable) */}
            {expandedAM === item.alertManager.id && (
              <div className="border-t border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400">
                      <th className="text-left px-4 py-2 font-medium">Alert</th>
                      <th className="text-left px-4 py-2 font-medium">Severity</th>
                      <th className="text-left px-4 py-2 font-medium">Instance</th>
                      <th className="text-left px-4 py-2 font-medium">Since</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {item.alerts.map((alert) => (
                      <AlertRow
                        key={alert.fingerprint}
                        alert={alert}
                        onSilence={() => setSilenceContext({ am: item.alertManager, alert })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <AddAlertManagerModal onClose={() => setShowAdd(false)} onAdded={fetchData} />
      )}

      {silenceContext !== null && (
        <SilenceModal
          alertManagers={alertManagers}
          preselectedAM={silenceContext.am}
          preselectedAlert={silenceContext.alert}
          onClose={() => setSilenceContext(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

function SeverityBadge({ severity, count }: { severity: Severity; count: number }) {
  const colors: Record<Severity, string> = {
    critical: 'bg-red-900 text-red-300',
    error: 'bg-orange-900 text-orange-300',
    warning: 'bg-yellow-900 text-yellow-300',
    info: 'bg-blue-900 text-blue-300',
    none: 'bg-gray-700 text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[severity]} ${count === 0 ? 'opacity-30' : ''}`}>
      {severity[0].toUpperCase()}: {count}
    </span>
  );
}

function AlertRow({ alert, onSilence }: { alert: Alert; onSilence: () => void }) {
  const severity = (alert.labels.severity ?? 'none').toLowerCase();
  const severityColors: Record<string, string> = {
    critical: 'text-red-400',
    error: 'text-orange-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
    none: 'text-gray-400',
  };
  const color = severityColors[severity] ?? 'text-gray-400';

  return (
    <tr className="border-t border-gray-700/50 hover:bg-gray-700/30">
      <td className="px-4 py-2 text-white">{alert.labels.alertname ?? '—'}</td>
      <td className={`px-4 py-2 font-semibold ${color}`}>{severity}</td>
      <td className="px-4 py-2 text-gray-400">{alert.labels.instance ?? alert.labels.job ?? '—'}</td>
      <td className="px-4 py-2 text-gray-500">
        {new Date(alert.startsAt).toLocaleString()}
      </td>
      <td className="px-4 py-2 text-right">
        <button
          onClick={onSilence}
          className="text-orange-400 hover:text-orange-300 text-xs border border-orange-900 hover:border-orange-700 px-2 py-0.5 rounded"
        >
          Silence
        </button>
      </td>
    </tr>
  );
}
