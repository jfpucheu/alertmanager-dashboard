'use client';

import { useState } from 'react';
import { AlertManager, FetchMode } from '@/types/alertmanager';

type ProxyMode = 'global' | 'custom' | 'none';

function initialProxyMode(am?: AlertManager): ProxyMode {
  if (!am) return 'global';
  if (am.noProxy) return 'none';
  if (am.proxy) return 'custom';
  return 'global';
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
  existing?: AlertManager;
}

export default function AddAlertManagerModal({ onClose, onSaved, existing }: Props) {
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [fetchMode, setFetchMode] = useState<FetchMode>(existing?.fetchMode ?? 'server');
  const [proxyMode, setProxyMode] = useState<ProxyMode>(initialProxyMode(existing));
  const [customProxy, setCustomProxy] = useState(existing?.proxy ?? '');
  const [insecure, setInsecure] = useState(existing?.insecure ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL are required'); return; }
    if (fetchMode === 'server' && proxyMode === 'custom' && !customProxy.trim()) {
      setError('Proxy URL is required'); return;
    }
    setLoading(true);
    setError('');
    try {
      const body = {
        name: name.trim(),
        url: url.trim(),
        fetchMode,
        proxy: fetchMode === 'server' && proxyMode === 'custom' ? customProxy.trim() : undefined,
        noProxy: fetchMode === 'server' && proxyMode === 'none',
        insecure: fetchMode === 'server' ? insecure : undefined,
      };
      const res = await fetch(
        isEdit ? `/api/alertmanagers?id=${existing!.id}` : '/api/alertmanagers',
        { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? 'Failed'); }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500';
  const modeBtnCls = (active: boolean) =>
    `flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
      active
        ? 'bg-blue-600 border-blue-500 text-white'
        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">
            {isEdit ? 'Modifier AlertManager' : 'Add AlertManager'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* ── Fetch mode ── */}
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 font-medium">Mode d&apos;accès</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFetchMode('server')} className={modeBtnCls(fetchMode === 'server')}>
                🖥 Serveur → Alertmanager
              </button>
              <button type="button" onClick={() => setFetchMode('browser')} className={modeBtnCls(fetchMode === 'browser')}>
                🌐 Navigateur → Alertmanager
              </button>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5">
              {fetchMode === 'server'
                ? 'Le serveur Next.js proxifie les appels. Supporte proxy HTTP et TLS auto-signé.'
                : 'Le navigateur appelle alertmanager directement. Requiert CORS sur alertmanager : --web.cors.origin'}
            </p>
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production" className={inputCls} />
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://alertmanager:9093" type="url" className={inputCls} />
          </div>

          {/* ── Server-only options ── */}
          {fetchMode === 'server' && (
            <>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2">Proxy</label>
                <div className="flex gap-2 mb-2">
                  {(['global', 'custom', 'none'] as ProxyMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setProxyMode(mode)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                        proxyMode === mode
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {mode === 'global' ? 'Use global' : mode === 'custom' ? 'Custom' : 'No proxy'}
                    </button>
                  ))}
                </div>
                {proxyMode === 'global' && <p className="text-gray-400 dark:text-gray-500 text-xs">Uses the proxy configured in Settings (if any).</p>}
                {proxyMode === 'none' && <p className="text-gray-400 dark:text-gray-500 text-xs">Direct connection, ignores the global proxy.</p>}
                {proxyMode === 'custom' && (
                  <input value={customProxy} onChange={(e) => setCustomProxy(e.target.value)} placeholder="http://proxy-host:3128" type="url" className={inputCls} />
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setInsecure((v) => !v)}
                  className={`relative w-9 h-5 rounded-full border-2 border-transparent transition-colors shrink-0 ${insecure ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${insecure ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Ignorer les erreurs TLS</span>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Accepte les certificats auto-signés ou expirés.</p>
                </div>
              </label>
            </>
          )}

          {/* ── Browser-mode CORS note ── */}
          {fetchMode === 'browser' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">Configuration CORS requise sur alertmanager</p>
              <code className="block bg-blue-100 dark:bg-blue-900/40 rounded px-2 py-1 font-mono text-xs break-all">
                --web.cors.origin=&apos;{typeof window !== 'undefined' ? window.location.origin : 'https://your-dashboard'}&apos;
              </code>
              <p className="text-blue-600 dark:text-blue-400">Les certificats auto-signés doivent être acceptés par le navigateur.</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
              {loading ? '…' : isEdit ? 'Enregistrer' : 'Add AlertManager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
