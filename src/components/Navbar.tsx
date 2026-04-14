'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import SettingsModal from '@/components/SettingsModal';
import { GlobalConfig } from '@/types/alertmanager';

const DEFAULT_TITLE = 'AlertManager Dashboard';
const DEFAULT_LOGO = '🔔';

export default function Navbar() {
  const pathname = usePathname();
  const { status } = useSession();
  const isLdap = status === 'authenticated';
  const [showSettings, setShowSettings] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((config: GlobalConfig) => {
        if (config.title) setTitle(config.title);
        if (config.logoUrl) setLogoUrl(config.logoUrl);
      })
      .catch(() => {});
  }, []);

  const links = [
    { href: '/', label: 'Overview' },
    { href: '/alertmanagers', label: 'AlertManagers' },
    { href: '/silences', label: 'Silences' },
  ];

  return (
    <>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="w-7 h-7 object-contain rounded" />
            ) : (
              <span className="text-red-500 text-xl">{DEFAULT_LOGO}</span>
            )}
            <span className="text-gray-900 dark:text-white font-bold text-lg tracking-wide">{title}</span>
          </div>
          <div className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Settings
        </button>
        {isLdap && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
            title="Déconnexion"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 000-2H4V5h6a1 1 0 000-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 11H9a1 1 0 010-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Déconnexion
          </button>
        )}
      </nav>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onBrandingChanged={(t, l) => { setTitle(t || DEFAULT_TITLE); setLogoUrl(l || ''); }}
        />
      )}
    </>
  );
}
