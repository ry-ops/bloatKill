# bloatkill

> Windows storage remediation dashboard — GitOps style.

**Live dashboard → [ry-ops.github.io/bloatkill](https://ry-ops.github.io/bloatkill)**

A GitOps-style dashboard for auditing and executing Windows storage cleanup across:

- `C:\Windows\WinSxS` — Component Store
- `C:\Windows\Installer` — MSI/MSP cache

Built as a companion to [git-steer](https://github.com/ry-ops/git-steer), part of the [ry-ops](https://ry-ops.dev) infrastructure automation stack.

---

## Features

- 📊 **Overview** — metric cards, warnings, quick actions
- 📁 **Folder Details** — expandable per-folder breakdown with inline commands
- 🔧 **Cleanup Methods** — 8 methods with copy-ready PowerShell/DISM commands
- 📋 **Run History** — log of all cleanup scans
- 🔍 Live search + sortable tables on every tab
- 🏷 Global risk filter (SAFE / LOW / MEDIUM / DANGER)
- ⬇ CSV export
- ⌨ Keyboard shortcuts (`1`–`4`, `?`, `/`, `Esc`)

---

## Deployment

This dashboard is a single static `index.html` — no build step, no dependencies.

Deployed via GitHub Pages from the `main` branch root.

---

## Usage

### Manual cleanup

Copy commands directly from the **Cleanup Methods** tab in the dashboard.

### Automated (GitHub Actions)

You can wire a scheduled workflow to run DISM scans and push updated run history:

```yaml
name: Bloatkill Heartbeat
on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  scan:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run DISM ComponentCleanup
        run: Dism.exe /online /Cleanup-Image /StartComponentCleanup
      - name: Commit updated dashboard
        run: |
          git config user.name "bloatkill-bot"
          git config user.email "bot@ry-ops.dev"
          git add -A
          git commit -m "chore: heartbeat scan $(date -u +%Y-%m-%d)" || exit 0
          git push
```

---

## Risk Levels

| Level | Color | Meaning |
|-------|-------|---------|
| SAFE | 🟢 Green | Read-only / scan only — no changes made |
| LOW | 🟡 Yellow | Standard cleanup — reversible, well-tested |
| MEDIUM | 🟠 Orange | Moderate risk — verify before running |
| DANGER | 🔴 Red | Irreversible — data loss possible |

---

## Related Projects

- [git-steer](https://github.com/ry-ops/git-steer) — GitHub autonomy engine & security dashboard
- [ry-ops.dev](https://ry-ops.dev) — Infrastructure automation blog

---

*Part of the ry-ops infrastructure automation suite.*
