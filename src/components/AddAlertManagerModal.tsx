'use client';

import { useState } from 'react';

type ProxyMode = 'global' | 'custom' | 'none';

interface AddAlertManagerModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddAlertManagerModal({ onClose, onAdded }: AddAlertManagerModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [proxyMode, setProxyMode] = useState<ProxyMode>('global');
  const [customProxy, setCustomProxy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError('Name and URL are required'); return; }
    if (proxyMode === 'custom' && !customProxy.trim()) { setError('Proxy URL is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/alertmanagers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          proxy: proxyMode === 'custom' ? customProxy.trim() : undefined,
          noProxy: proxyMode === 'none',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to add');
      }
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Add AlertManager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production" className={inputCls} />
          </div>
          <div>
            <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://alertmanager:9093" type="url" className={inputCls} />
          </div>

          {/* Proxy */}
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
            {proxyMode === 'global' && (
              <p className="text-gray-400 dark:text-gray-500 text-xs">Uses the proxy configured in Settings (if any).</p>
            )}
            {proxyMode === 'none' && (
              <p className="text-gray-400 dark:text-gray-500 text-xs">Direct connection, ignores the global proxy.</p>
            )}
            {proxyMode === 'custom' && (
              <input value={customProxy} onChange={(e) => setCustomProxy(e.target.value)} placeholder="http://proxy-host:3128" type="url" className={inputCls} />
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Adding...' : 'Add AlertManager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
