import { Client } from 'ldapts';
import { LdapConfig } from '@/types/alertmanager';

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
