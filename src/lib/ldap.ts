import { Client } from 'ldapts';
import { LdapConfig } from '@/types/alertmanager';

/**
 * Build the effective LDAP config by merging stored config with environment variables.
 * Environment variables take priority over stored config.
 *
 * Env vars:
 *   LDAP_ENABLED        — "true" to enforce authentication (also read by middleware)
 *   LDAP_URL            — ldap://host:389 or ldaps://host:636
 *   LDAP_BIND_DN        — service account DN
 *   LDAP_BIND_PASSWORD  — service account password
 *   LDAP_SEARCH_BASE    — DC=example,DC=com
 *   LDAP_SEARCH_FILTER  — (uid={{username}})
 *   LDAP_DISPLAY_ATTR   — attribute used as display name (default: cn)
 *
 * Returns null if LDAP is not enabled or if required fields are missing.
 */
export function getLdapConfig(stored?: LdapConfig): LdapConfig | null {
  const envEnabled = process.env.LDAP_ENABLED === 'true';
  const storedEnabled = stored?.enabled === true;

  const merged: LdapConfig = {
    enabled:         envEnabled || storedEnabled,
    url:             process.env.LDAP_URL            ?? stored?.url            ?? '',
    bindDN:          process.env.LDAP_BIND_DN        ?? stored?.bindDN        ?? '',
    bindPassword:    process.env.LDAP_BIND_PASSWORD  ?? stored?.bindPassword  ?? '',
    searchBase:      process.env.LDAP_SEARCH_BASE    ?? stored?.searchBase    ?? '',
    searchFilter:    process.env.LDAP_SEARCH_FILTER  ?? stored?.searchFilter  ?? '',
    displayNameAttr: process.env.LDAP_DISPLAY_ATTR   ?? stored?.displayNameAttr ?? 'cn',
  };

  if (!merged.enabled) return null;
  if (!merged.url || !merged.bindDN || !merged.bindPassword || !merged.searchBase || !merged.searchFilter) return null;

  return merged;
}

export interface LdapUser {
  username: string;
  displayName: string;
}

export async function authenticateLDAP(
  config: LdapConfig,
  username: string,
  password: string
): Promise<LdapUser | null> {
  if (!username || !password) return null;

  const serviceClient = new Client({ url: config.url, tlsOptions: { rejectUnauthorized: false } });
  try {
    // 1. Bind with service account to search the directory
    await serviceClient.bind(config.bindDN, config.bindPassword);

    const filter = config.searchFilter.replace(/\{\{username\}\}/g, username);
    const { searchEntries } = await serviceClient.search(config.searchBase, {
      scope: 'sub',
      filter,
      attributes: ['dn', config.displayNameAttr || 'cn'],
    });
    await serviceClient.unbind();

    if (!searchEntries.length) return null;

    const userDN = searchEntries[0].dn;
    const rawName = searchEntries[0][config.displayNameAttr || 'cn'];
    const displayName = Array.isArray(rawName) ? String(rawName[0]) : String(rawName || username);

    // 2. Try to bind as the user to verify password
    const userClient = new Client({ url: config.url, tlsOptions: { rejectUnauthorized: false } });
    try {
      await userClient.bind(userDN, password);
      await userClient.unbind();
      return { username, displayName };
    } catch {
      return null;
    }
  } catch (err) {
    await serviceClient.unbind().catch(() => {});
    console.error('[LDAP] Authentication error:', err);
    return null;
  }
}
