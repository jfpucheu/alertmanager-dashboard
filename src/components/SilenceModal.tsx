'use client';

import { useState } from 'react';
import { AlertManager, Alert, SilenceMatcher } from '@/types/alertmanager';

interface SilenceModalProps {
  alertManagers: AlertManager[];
  preselectedAM?: AlertManager;
  preselectedAlert?: Alert;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SilenceModal({
  alertManagers,
  preselectedAM,
  preselectedAlert,
  onClose,
  onSuccess,
}: SilenceModalProps) {
  const [selectedAMId, setSelectedAMId] = useState(preselectedAM?.id ?? '');
  const [matchers, setMatchers] = useState<SilenceMatcher[]>(
    preselectedAlert
      ? Object.entries(preselectedAlert.labels).map(([name, value]) => ({
          name,
          value,
          isRegex: false,
          isEqual: true,
        }))
      : [{ name: '', value: '', isRegex: false, isEqual: true }]
  );
  const [duration, setDuration] = useState('2h');
  const [comment, setComment] = useState('');
  const [createdBy, setCreatedBy] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addMatcher() {
    setMatchers((m) => [...m, { name: '', value: '', isRegex: false, isEqual: true }]);
  }

  function removeMatcher(index: number) {
    setMatchers((m) => m.filter((_, i) => i !== index));
  }

  function updateMatcher(index: number, field: keyof SilenceMatcher, value: string | boolean) {
    setMatchers((m) => m.map((matcher, i) => (i === index ? { ...matcher, [field]: value } : matcher)));
  }

  function parseDuration(d: string): number {
    const match = d.match(/^(\d+)(m|h|d)$/);
    if (!match) return 2 * 60 * 60 * 1000;
    const val = parseInt(match[1]);
    switch (match[2]) {
      case 'm': return val * 60 * 1000;
      case 'h': return val * 60 * 60 * 1000;
      case 'd': return val * 24 * 60 * 60 * 1000;
      default: return 2 * 60 * 60 * 1000;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAMId) { setError('Please select an AlertManager'); return; }
    const validMatchers = matchers.filter((m) => m.name && m.value);
    if (validMatchers.length === 0) { setError('At least one matcher is required'); return; }
    setLoading(true);
    setError('');
    const now = Date.now();
    const endsAt = new Date(now + parseDuration(duration)).toISOString();
    try {
      const res = await fetch('/api/silences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertManagerId: selectedAMId,
          silence: {
            matchers: validMatchers,
            startsAt: new Date(now).toISOString(),
            endsAt,
            comment: comment || 'Created via dashboard',
            createdBy,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating silence');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">Create Silence</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* AlertManager selector */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">AlertManager</label>
            <select
              value={selectedAMId}
              onChange={(e) => setSelectedAMId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Select an AlertManager —</option>
              {alertManagers.map((am) => (
                <option key={am.id} value={am.id}>{am.name} ({am.url})</option>
              ))}
            </select>
          </div>

          {/* Matchers */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-400 text-sm">Matchers</label>
              <button type="button" onClick={addMatcher} className="text-xs text-blue-400 hover:text-blue-300">
                + Add matcher
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {matchers.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder="label name"
                    value={m.name}
                    onChange={(e) => updateMatcher(i, 'name', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1.5 text-sm"
                  />
                  <select
                    value={`${m.isEqual}-${m.isRegex}`}
                    onChange={(e) => {
                      const [eq, rx] = e.target.value.split('-');
                      updateMatcher(i, 'isEqual', eq === 'true');
                      updateMatcher(i, 'isRegex', rx === 'true');
                    }}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1.5 text-sm"
                  >
                    <option value="true-false">=</option>
                    <option value="false-false">!=</option>
                    <option value="true-true">=~</option>
                    <option value="false-true">!~</option>
                  </select>
                  <input
                    placeholder="value"
                    value={m.value}
                    onChange={(e) => updateMatcher(i, 'value', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1.5 text-sm"
                  />
                  {matchers.length > 1 && (
                    <button type="button" onClick={() => removeMatcher(i)} className="text-gray-500 hover:text-red-400 text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-sm mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
                <option value="2h">2 hours</option>
                <option value="4h">4 hours</option>
                <option value="8h">8 hours</option>
                <option value="1d">1 day</option>
                <option value="7d">7 days</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-sm mb-1">Created by</label>
              <input
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Reason for silencing..."
              className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Silence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
