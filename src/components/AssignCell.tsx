'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Assignment } from '@/types/alertmanager';

const LS_KEY = 'am-dashboard-username';

interface AssignCellProps {
  amId: string;
  fingerprint: string;
  assignment?: Assignment;
  onChanged: () => void;
}

export default function AssignCell({ amId, fingerprint, assignment, onChanged }: AssignCellProps) {
  const { data: session } = useSession();
  const sessionUsername = (session?.user as { username?: string })?.username ?? session?.user?.name ?? null;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill with session username > localStorage fallback
  useEffect(() => {
    if (editing) {
      const saved = sessionUsername ?? localStorage.getItem(LS_KEY) ?? '';
      setName(saved);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing, sessionUsername]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!sessionUsername) localStorage.setItem(LS_KEY, name.trim());
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amId, fingerprint, name: name.trim() }),
    });
    setEditing(false);
    onChanged();
  }

  async function handleUnassign() {
    await fetch(`/api/assignments?amId=${amId}&fingerprint=${fingerprint}`, { method: 'DELETE' });
    onChanged();
  }

  if (assignment) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium max-w-[120px] truncate" title={assignment.name}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          {assignment.name}
        </span>
        <button
          onClick={handleUnassign}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Désaffecter"
        >
          ✕
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <form onSubmit={handleAssign} className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom"
          className="w-24 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white rounded px-1.5 py-0.5 text-xs"
        />
        <button type="submit" className="text-green-500 hover:text-green-400 text-xs font-bold">✓</button>
        <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">✕</button>
      </form>
    );
  }

  async function handleQuickAssign() {
    if (!sessionUsername) { setEditing(true); return; }
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amId, fingerprint, name: sessionUsername }),
    });
    onChanged();
  }

  return (
    <button
      onClick={handleQuickAssign}
      className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 px-2 py-0.5 rounded transition-colors"
    >
      + Affecter
    </button>
  );
}
