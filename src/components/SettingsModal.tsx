'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { GlobalConfig, LdapConfig } from '@/types/alertmanager';

interface SettingsModalProps {
  onClose: () => void;
  onBrandingChanged?: (title: string, logoUrl: string) => void;
}

const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark',  label: 'Dark',  icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

const DEFAULT_LDAP: LdapConfig = {
  enabled: false,
  url: '',
  bindDN: '',
  bindPassword: '',
  searchBase: '',
  searchFilter: '(uid={{username}})',
  displayNameAttr: 'cn',
};

export default function SettingsModal({ onClose, onBrandingChanged }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const sessionUsername = (session?.user as { username?: string })?.username ?? session?.user?.name ?? null;

  const [proxy, setProxy] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [ldap, setLdap] = useState<LdapConfig>(DEFAULT_LDAP);
  const [showLdapPassword, setShowLdapPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((config: GlobalConfig) => {
        setProxy(config.proxy ?? '');
        setAppTitle(config.title ?? '');
        setLogoUrl(config.logoUrl ?? '');
        setLdap(config.ldap ?? DEFAULT_LDAP);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateLdap(patch: Partial<LdapConfig>) {
    setLdap((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const body: GlobalConfig = {
        proxy: proxy.trim() || undefined,
        ldap: ldap.url ? ldap : undefined,
        title: appTitle.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      };
      if (body.proxy) {
        try { new URL(body.proxy); } catch {
          throw new Error('URL proxy invalide');
        }
      }
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onBrandingChanged?.(appTitle.trim(), logoUrl.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Session info */}
          {sessionUsername && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
              <div>
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Connecté en tant que</p>
                <p className="text-blue-900 dark:text-blue-100 font-semibold">{sessionUsername}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          )}

          {/* Theme */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Thème</label>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    theme === t.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 text-sm py-2">Chargement…</div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Branding */}
              <div className="flex flex-col gap-3">
                <h3 className="text-gray-700 dark:text-gray-300 text-sm font-medium">Branding</h3>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">Titre de l&apos;application</label>
                  <input
                    type="text"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="AlertManager Dashboard"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">URL du logo</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://… ou /logo.png"
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-600"
                    />
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="preview" className="w-8 h-8 object-contain rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                    ) : (
                      <span className="text-2xl">🔔</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Laisser vide pour utiliser l&apos;icône par défaut.</p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Proxy */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                  Global proxy
                </label>
                <input
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  placeholder="http://proxy-host:3128  (laisser vide pour désactiver)"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-600"
                />
                <p className="text-gray-500 text-xs mt-1.5">
                  Appliqué à tous les AlertManagers sauf surcharge par instance.
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* LDAP */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 dark:text-gray-300 text-sm font-medium">Authentification LDAP</label>
                  <button
                    type="button"
                    onClick={() => updateLdap({ enabled: !ldap.enabled })}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                      ldap.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${ldap.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {ldap.enabled && (
                  <div className="flex flex-col gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                      Pour que la protection soit active, définissez aussi <code className="font-mono">LDAP_ENABLED=true</code> dans les variables d&apos;environnement.
                    </p>

                    <LdapField label="URL LDAP" placeholder="ldap://host:389 ou ldaps://host:636" value={ldap.url} onChange={(v) => updateLdap({ url: v })} />
                    <LdapField label="Bind DN (compte service)" placeholder="CN=svc,DC=example,DC=com" value={ldap.bindDN} onChange={(v) => updateLdap({ bindDN: v })} />
                    <div>
                      <label className="block text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">Mot de passe service</label>
                      <div className="relative">
                        <input
                          type={showLdapPassword ? 'text' : 'password'}
                          value={ldap.bindPassword}
                          onChange={(e) => updateLdap({ bindPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded px-3 py-1.5 text-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLdapPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                        >
                          {showLdapPassword ? 'Masquer' : 'Afficher'}
                        </button>
                      </div>
                    </div>
                    <LdapField label="Search Base" placeholder="DC=example,DC=com" value={ldap.searchBase} onChange={(v) => updateLdap({ searchBase: v })} />
                    <LdapField label="Search Filter" placeholder="(uid={{username}})" value={ldap.searchFilter} onChange={(v) => updateLdap({ searchFilter: v })} />
                    <LdapField label="Attribut nom affiché" placeholder="cn ou displayName" value={ldap.displayNameAttr} onChange={(v) => updateLdap({ displayNameAttr: v })} />
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg">
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function LdapField({ label, placeholder, value, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-gray-600 dark:text-gray-400 text-xs font-medium mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded px-3 py-1.5 text-xs placeholder-gray-400 dark:placeholder-gray-600"
      />
    </div>
  );
}
