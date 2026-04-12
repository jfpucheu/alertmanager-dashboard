'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Overview' },
    { href: '/alertmanagers', label: 'AlertManagers' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-8">
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-xl">🔔</span>
        <span className="text-white font-bold text-lg tracking-wide">AlertManager Dashboard</span>
      </div>
      <div className="flex gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
