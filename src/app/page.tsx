'use client';

import { useEffect, useState, useCallback } from 'react';
import SeverityCard from '@/components/SeverityCard';
import SilenceModal from '@/components/SilenceModal';
import { AlertManagerStatus, SeverityCounts, Severity, SEVERITIES, AlertManager } from '@/types/alertmanager';

const EMPTY_COUNTS: SeverityCounts = { critical: 0, error: 0, warning: 0, info: 0, none: 0 };

export default function HomePage() {
  const [data, setData] = useState<AlertManagerStatus[]>([]);
  const [alertManagers, setAlertManagers] = useState<AlertManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showSilence, setShowSilence] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, amsRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/alertmanagers'),
      ]);
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
    (acc, am) => {
      for (const s of SEVERITIES) acc[s] += am.severityCounts[s];
      return acc;
    },
    { ...EMPTY_COUNTS }
  );

  const totalAlerts = SEVERITIES.reduce((sum, s) => sum + totals[s], 0);
  const reachableCount = data.filter((d) => d.reachable).length;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Overview</h1>
          <p className="text-gray-400 text-sm mt-1">
            {reachableCount}/{data.length} AlertManagers reachable
            {lastRefresh && (
              <span className="ml-3 text-gray-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSilence(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg"
          >
            + Create Silence
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

      {/* Total alerts summary */}
      {data.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <span className="text-gray-400 text-sm">Total active alerts:</span>
          <span className="text-white text-2xl font-bold">{totalAlerts}</span>
          <span className="text-gray-500 text-sm">
            across {data.length} AlertManager{data.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* 5 Severity blocks */}
      {data.length === 0 && !loading ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No AlertManagers configured.</p>
          <p className="text-sm mt-1">
            Go to{' '}
            <a href="/alertmanagers" className="text-blue-400 hover:underline">
              AlertManagers
            </a>{' '}
            to add one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {SEVERITIES.map((severity) => (
            <SeverityCard key={severity} severity={severity as Severity} count={totals[severity]} />
          ))}
        </div>
      )}

      {/* Per-AM quick status */}
      {data.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">
            Per AlertManager
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {data.map((am) => (
              <div
                key={am.alertManager.id}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${am.reachable ? 'bg-green-400' : 'bg-red-500'}`}
                  />
                  <span className="text-white font-medium text-sm">{am.alertManager.name}</span>
                  <span className="text-gray-500 text-xs">{am.alertManager.url}</span>
                </div>
                {am.reachable ? (
                  <div className="flex gap-2">
                    {SEVERITIES.map((s) =>
                      am.severityCounts[s] > 0 ? (
                        <SeverityBadge key={s} severity={s} count={am.severityCounts[s]} />
                      ) : null
                    )}
                    {SEVERITIES.every((s) => am.severityCounts[s] === 0) && (
                      <span className="text-gray-500 text-xs">No active alerts</span>
                    )}
                  </div>
                ) : (
                  <span className="text-red-400 text-xs">Unreachable: {am.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showSilence && (
        <SilenceModal
          alertManagers={alertManagers}
          onClose={() => setShowSilence(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

function SeverityBadge({ severity, count }: { severity: Severity; count: number }) {
  const colors: Record<Severity, string> = {
    critical: 'bg-red-800 text-red-200',
    error: 'bg-orange-800 text-orange-200',
    warning: 'bg-yellow-800 text-yellow-200',
    info: 'bg-blue-800 text-blue-200',
    none: 'bg-gray-700 text-gray-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[severity]}`}>
      {severity}: {count}
    </span>
  );
}
