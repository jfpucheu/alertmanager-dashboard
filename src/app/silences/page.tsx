'use client';

import { useEffect, useState, useCallback } from 'react';
import SilenceModal from '@/components/SilenceModal';
import { AMSilences, AlertManager, Silence } from '@/types/alertmanager';

interface FlatSilence {
  silence: Silence;
  amName: string;
  amId: string;
}

function matchesSearch(fs: FlatSilence, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return (
    fs.silence.comment.toLowerCase().includes(q) ||
    fs.silence.createdBy.toLowerCase().includes(q) ||
    fs.silence.matchers.some((m) => m.name.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))
  );
}

export default function SilencesPage() {
  const [data, setData] = useState<AMSilences[]>([]);
  const [alertManagers, setAlertManagers] = useState<AlertManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAmId, setSelectedAmId] = useState('');
  const [search, setSearch] = useState('');
  const [expiring, setExpiring] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [silencesRes, amsRes] = await Promise.all([fetch('/api/silences'), fetch('/api/alertmanagers')]);
      setData(await silencesRes.json());
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

  async function handleExpire(amId: string, silenceId: string) {
    if (!confirm('Expirer ce silence ?')) return;
    setExpiring(silenceId);
    try {
      await fetch(`/api/silences?amId=${amId}&silenceId=${silenceId}`, { method: 'DELETE' });
      await fetchData();
    } finally {
      setExpiring(null);
    }
  }

  const filtered = (selectedAmId
    ? data.filter((d) => d.alertManager.id === selectedAmId)
    : data
  ).flatMap((d) =>
    d.silences.map((silence) => ({ silence, amName: d.alertManager.name, amId: d.alertManager.id }))
  );

  const active = filtered.filter((fs) => fs.silence.status.state === 'active' && matchesSearch(fs, search));
  const pending = filtered.filter((fs) => fs.silence.status.state === 'pending' && matchesSearch(fs, search));
  const expired = filtered.filter((fs) => fs.silence.status.state === 'expired' && matchesSearch(fs, search));

  const reachableCount = data.filter((d) => d.reachable).length;

  return (
    <div className="flex-1 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-white text-2xl font-bold">Silences</h1>
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
                <option key={d.alertManager.id} value={d.alertManager.id}>{d.alertManager.name}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg">
            + Create Silence
          </button>
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">Actifs :</span>
          <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">{active.length}</span>
        </div>
        {pending.length > 0 && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-gray-500 dark:text-gray-400 text-sm">En attente :</span>
              <span className="text-blue-500 dark:text-blue-400 font-bold text-lg">{pending.length}</span>
            </div>
          </>
        )}
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">Expirés :</span>
          <span className="text-gray-500 dark:text-gray-400 font-bold text-lg">{expired.length}</span>
        </div>
      </div>

      {/* Active + pending */}
      {(active.length > 0 || pending.length > 0) ? (
        <SilenceTable
          title="Actifs"
          silences={[...active, ...pending]}
          color="purple"
          expiring={expiring}
          onExpire={handleExpire}
          showExpireButton
        />
      ) : (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <p>Aucun silence actif.</p>
        </div>
      )}

      {/* Expired — collapsible */}
      {expired.length > 0 && (
        <div>
          <button
            onClick={() => setShowExpired((v) => !v)}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium mb-2 transition-colors"
          >
            <span>{showExpired ? '▼' : '▶'}</span>
            <span>Silences expirés ({expired.length})</span>
          </button>
          {showExpired && (
            <SilenceTable
              title="Expirés"
              silences={expired}
              color="gray"
              expiring={expiring}
              onExpire={handleExpire}
              showExpireButton={false}
            />
          )}
        </div>
      )}

      {showCreate && (
        <SilenceModal alertManagers={alertManagers} onClose={() => setShowCreate(false)} onSuccess={fetchData} />
      )}
    </div>
  );
}

// ── SilenceTable ───────────────────────────────────────────────────────────

const COLOR = {
  purple: {
    border: 'border-purple-500 dark:border-purple-600',
    dot: 'bg-purple-500',
    label: 'text-purple-600 dark:text-purple-400',
  },
  gray: {
    border: 'border-gray-400 dark:border-gray-600',
    dot: 'bg-gray-400',
    label: 'text-gray-500 dark:text-gray-400',
  },
};

function SilenceTable({ title, silences, color, expiring, onExpire, showExpireButton }: {
  title: string;
  silences: { silence: Silence; amName: string; amId: string }[];
  color: keyof typeof COLOR;
  expiring: string | null;
  onExpire: (amId: string, id: string) => void;
  showExpireButton: boolean;
}) {
  const c = COLOR[color];
  return (
    <div className={`bg-white dark:bg-gray-800 border-2 ${c.border} rounded-xl overflow-hidden`}>
      <div className={`bg-gray-50 dark:bg-gray-900 border-b-2 ${c.border} px-4 py-2 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-widest ${c.label}`}>{title}</span>
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
            {showExpireButton && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {silences.map(({ silence, amName, amId }) => (
            <tr
              key={`${amId}::${silence.id}`}
              className={`border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${color === 'gray' ? 'opacity-60' : ''}`}
            >
              <td className="px-4 py-2 text-gray-900 dark:text-white max-w-[180px] truncate" title={silence.comment}>
                {silence.comment || '—'}
              </td>
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
              {showExpireButton && (
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onExpire(amId, silence.id)}
                    disabled={expiring === silence.id}
                    className="text-red-500 hover:text-red-400 text-xs border border-red-200 dark:border-red-900 hover:border-red-400 dark:hover:border-red-700 px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                  >
                    {expiring === silence.id ? '…' : 'Expirer'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
