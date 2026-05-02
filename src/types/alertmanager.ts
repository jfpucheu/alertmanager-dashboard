export type Severity = 'critical' | 'error' | 'warning' | 'info' | 'none';

export const SEVERITIES: Severity[] = ['critical', 'error', 'warning', 'info', 'none'];

export type FetchMode = 'server' | 'browser';

export interface AlertManager {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  /**
   * 'server' (default): the Next.js server proxies calls to alertmanager.
   *   Supports proxy + TLS override. Requires server → alertmanager network path.
   * 'browser': the user's browser calls alertmanager directly.
   *   Requires browser → alertmanager network path + CORS on alertmanager.
   */
  fetchMode?: FetchMode;
  /** Custom proxy for this AlertManager. Overrides the global proxy. Server mode only. */
  proxy?: string;
  /** If true, bypass the global proxy for this AlertManager. Server mode only. */
  noProxy?: boolean;
  /** If true, ignore TLS certificate errors (self-signed, expired…). Server mode only. */
  insecure?: boolean;
}

export interface LdapConfig {
  enabled: boolean;
  url: string;              // ldap://host:389 or ldaps://host:636
  bindDN: string;           // CN=svc,DC=example,DC=com
  bindPassword: string;
  searchBase: string;       // DC=example,DC=com
  searchFilter: string;     // (uid={{username}})
  displayNameAttr: string;  // cn or displayName
}

export interface GlobalConfig {
  proxy?: string;
  ldap?: LdapConfig;
  title?: string;
  logoUrl?: string;
  /** Auto-refresh interval in milliseconds. 0 = disabled. Default: 30000. */
  refreshInterval?: number;
}

export interface AlertLabel {
  [key: string]: string;
}

export interface Alert {
  labels: AlertLabel;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  status: {
    state: 'active' | 'suppressed' | 'unprocessed';
    silencedBy: string[];
    inhibitedBy: string[];
  };
  receivers: { name: string }[];
  fingerprint: string;
}

export interface SeverityCounts {
  critical: number;
  error: number;
  warning: number;
  info: number;
  none: number;
}

export interface AlertManagerStatus {
  alertManager: AlertManager;
  alerts: Alert[];
  severityCounts: SeverityCounts;
  reachable: boolean;
  loading?: boolean;
  error?: string;
}

export interface SilenceMatcher {
  name: string;
  value: string;
  isRegex: boolean;
  isEqual: boolean;
}

export interface Assignment {
  /** key = `${amId}::${fingerprint}` */
  key: string;
  name: string;
  assignedAt: string;
}

export type AssignmentMap = Record<string, Assignment>;

export interface Silence {
  id: string;
  matchers: SilenceMatcher[];
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  createdBy: string;
  comment: string;
  status: { state: 'active' | 'pending' | 'expired' };
}

export interface AMSilences {
  alertManager: AlertManager;
  silences: Silence[];
  reachable: boolean;
  loading?: boolean;
  error?: string;
}

export interface SilencePayload {
  matchers: SilenceMatcher[];
  startsAt: string;
  endsAt: string;
  comment: string;
  createdBy: string;
}
