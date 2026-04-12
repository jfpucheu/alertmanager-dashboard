# AlertManager Dashboard

A central dashboard to monitor alerts from multiple [Prometheus Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) instances.

## Features

- **Overview page** — 5 severity blocks (Critical, Error, Warning, Info, None) showing global alert counts across all connected Alertmanagers
- **AlertManagers page** — list all connected instances with per-severity alert counts, expandable alert tables
- **Add/Remove Alertmanagers** — add any Alertmanager URL to monitor
- **Create Silences** — create a silence on any Alertmanager, either globally (custom matchers) or directly on a specific alert (matchers pre-filled)
- **Auto-refresh** every 30 seconds

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/)
- Alertmanager API v2

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Alertmanager URLs are stored in `data/alertmanagers.json` (created automatically at runtime, excluded from git).

To add an Alertmanager, use the **AlertManagers** page in the UI, or POST directly:

```bash
curl -X POST http://localhost:3000/api/alertmanagers \
  -H 'Content-Type: application/json' \
  -d '{"name": "Production", "url": "http://alertmanager:9093"}'
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alertmanagers` | List all configured Alertmanagers |
| `POST` | `/api/alertmanagers` | Add an Alertmanager (`{name, url}`) |
| `DELETE` | `/api/alertmanagers?id=<id>` | Remove an Alertmanager |
| `GET` | `/api/alerts` | Fetch active alerts from all Alertmanagers |
| `POST` | `/api/silences` | Create a silence (`{alertManagerId, silence}`) |

## Severity Mapping

Alerts are bucketed by their `severity` label:

| Label value | Bucket |
|-------------|--------|
| `critical` | Critical |
| `error` | Error |
| `warning` | Warning |
| `info`, `information`, `informing` | Info |
| anything else / missing | None |
