'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Identifiants invalides');
    } else {
      // Use window.location for absolute callbackUrls (e.g. https://host/path)
      // router.push() only handles relative paths correctly
      window.location.href = callbackUrl;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AlertManager Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Connectez-vous avec votre compte LDAP</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
