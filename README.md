# AlertManager Dashboard

A central dashboard to monitor alerts from multiple [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) instances.

## Features

- **Overview** — severity cards (Critical / Error / Warning / Info / None), expandable alert tables, filter by AlertManager and alertname
- **AlertManagers** — list instances with per-severity counts, expandable alert tables, add / edit / remove
- **Silences** — list active and expired silences, create / expire / extend silences
- **Assignments** — assign an alert to someone (persisted server-side)
- **Proxy support** — global proxy or per-AlertManager override (custom / global / none)
- **TLS** — optional per-AlertManager TLS certificate verification bypass
- **Branding** — custom title and logo in Settings
- **LDAP authentication** — optional, configured via environment variables, enforced via `LDAP_ENABLED=true`
- **Kubernetes storage** — data stored in a ConfigMap (etcd) when running in-cluster, JSON files otherwise
- **Dark / Light / System theme**
- **Auto-refresh** every 30 seconds

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [next-auth v4](https://next-auth.js.org/) — LDAP authentication
- [ldapts](https://github.com/ldapts/ldapts) — LDAP client
- [undici](https://github.com/nodejs/undici) — HTTP with proxy and TLS control
- Alertmanager API v2

---

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # edit at minimum NEXTAUTH_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mock Alertmanager (local testing)

```bash
npm run mock            # port 9093, prod preset
npm run mock:staging    # port 9094
npm run mock:quiet      # port 9095
npm run mock:all        # all three simultaneously
```

---

## Configuration

### Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | **Yes** | Random secret for JWT signing. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production | Full URL of the app, e.g. `https://dashboard.example.com` |
| `LDAP_ENABLED` | No | Set to `true` to enforce LDAP login on all routes (default: `false`) |
| `LDAP_URL` | No | LDAP server URL — overrides UI setting |
| `LDAP_BIND_DN` | No | Service account DN — overrides UI setting |
| `LDAP_BIND_PASSWORD` | No | Service account password — overrides UI setting |
| `LDAP_SEARCH_BASE` | No | Base DN for user search — overrides UI setting |
| `LDAP_SEARCH_FILTER` | No | Search filter (`{{username}}` placeholder) — overrides UI setting |
| `LDAP_DISPLAY_ATTR` | No | Display name attribute (default: `cn`) — overrides UI setting |
| `API_KEY` | No | Static key for programmatic API access — bypasses LDAP (see below) |

### Storage

| Environment | Backend |
|-------------|---------|
| Local dev | JSON files under `data/` (git-ignored) |
| Kubernetes | ConfigMap `alertmanager-dashboard` in the pod's namespace |

In-cluster storage is auto-detected via the `KUBERNETES_SERVICE_HOST` env variable and the service account token file. No configuration needed.

---

## LDAP Authentication

LDAP is **optional**. When disabled, the app is accessible without login.

### 1 — Configure LDAP via environment variables

Set the `LDAP_*` variables (see table above). The bind password can be stored in a Kubernetes Secret and injected as an env var — it never touches the ConfigMap.

```bash
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=CN=svc-dashboard,OU=Services,DC=example,DC=com
LDAP_BIND_PASSWORD=secret
LDAP_SEARCH_BASE=OU=Users,DC=example,DC=com
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_DISPLAY_ATTR=displayName
```

### 2 — Enable enforcement via environment variable

Set `LDAP_ENABLED=true` in your environment. This enables the middleware that redirects unauthenticated users to `/login`.

> **Why two steps?**  
> The LDAP config (credentials, server URL) lives in the store so it can be edited at runtime without redeploying. The enforcement flag is an env variable because the Next.js middleware runs at the edge and cannot read from the store.

### 3 — Kubernetes secret

```bash
kubectl create secret generic alertmanager-dashboard-auth \
  --from-literal=secret=$(openssl rand -base64 32) \
  -n monitoring
```

Then in `k8s/deployment.yaml`:

```yaml
- name: LDAP_ENABLED
  value: "true"
- name: NEXTAUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: alertmanager-dashboard-auth
      key: secret
- name: NEXTAUTH_URL
  value: "https://your-dashboard-url"
```

### Behaviour when LDAP is enabled

- Unauthenticated users are redirected to `/login`
- Successful login creates a JWT session (stored in a cookie)
- **Assignments**: clicking "+ Affecter" instantly assigns the alert to the logged-in user (no manual input)
- **Session info**: the logged-in username is displayed in Settings with a logout button

---

## API Key — Programmatic Access

When `LDAP_ENABLED=true`, all routes are protected. To call the API from scripts or pipelines without a browser session, set an `API_KEY` environment variable and include it in requests.

```bash
# Generate a key
openssl rand -hex 32

# Set in your environment / k8s Secret
API_KEY=<generated-key>
```

Pass the key in one of two ways:

```bash
# Option A — Authorization header
curl -H "Authorization: Bearer <key>" https://dashboard.example.com/api/alertmanagers

# Option B — X-Api-Key header
curl -H "X-Api-Key: <key>" https://dashboard.example.com/api/alertmanagers
```

Example — add an AlertManager from a script:

```bash
curl -s -X POST https://dashboard.example.com/api/alertmanagers \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production", "url": "http://alertmanager:9093"}'
```

> If `API_KEY` is not set, the bypass is disabled and only LDAP sessions are accepted.

---

## Kubernetes Deployment

Apply the manifests in order:

```bash
kubectl apply -f k8s/rbac.yaml        # ServiceAccount, Role, RoleBinding
kubectl apply -f k8s/deployment.yaml  # Deployment + Service
```

The RBAC grants the pod `get`, `patch`, `update`, and `create` on the `alertmanager-dashboard` ConfigMap only.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alertmanagers` | List AlertManagers |
| `POST` | `/api/alertmanagers` | Add AlertManager `{name, url, proxy?, noProxy?, insecure?}` |
| `PATCH` | `/api/alertmanagers?id=` | Update AlertManager |
| `DELETE` | `/api/alertmanagers?id=` | Remove AlertManager |
| `GET` | `/api/alerts` | Active alerts from all AlertManagers |
| `GET` | `/api/silences` | All silences (active + pending + expired) |
| `POST` | `/api/silences` | Create silence `{alertManagerId, silence}` |
| `PATCH` | `/api/silences` | Extend silence `{alertManagerId, silence, extraMs}` |
| `DELETE` | `/api/silences?amId=&silenceId=` | Expire silence |
| `GET` | `/api/assignments` | All assignments |
| `POST` | `/api/assignments` | Assign `{amId, fingerprint, name}` |
| `DELETE` | `/api/assignments?amId=&fingerprint=` | Remove assignment |
| `GET` | `/api/config` | Get global config |
| `PUT` | `/api/config` | Save global config `{proxy?, ldap?, title?, logoUrl?}` |

---

## Severity Mapping

Alerts are bucketed by their `severity` label:

| Label value | Bucket |
|-------------|--------|
| `critical` | Critical |
| `error` | Error |
| `warning` | Warning |
| `info`, `information`, `informing` | Info |
| anything else / missing | None |
