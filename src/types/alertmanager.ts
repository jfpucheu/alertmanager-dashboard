export type Severity = 'critical' | 'error' | 'warning' | 'info' | 'none';

export const SEVERITIES: Severity[] = ['critical', 'error', 'warning', 'info', 'none'];

export interface AlertManager {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  /** Custom proxy for this AlertManager. Overrides the global proxy. */
  proxy?: string;
  /** If true, bypass the global proxy for this AlertManager. */
  noProxy?: boolean;
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

export interface SilencePayload {
  matchers: SilenceMatcher[];
  startsAt: string;
  endsAt: string;
  comment: string;
  createdBy: string;
}
