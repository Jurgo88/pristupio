# Site Audit Test Plan

Tento dokument definuje opakovatelny test flow pre Site Audit po kazdom merge.

## Predpoklady

- deploy je dostupny (staging alebo production)
- mas platny bearer token prihlaseneho usera
- user ma opravnenie spustit site audit
- migration pre site audit tabulky je nasadena

## Smoke Script

Skript je v:

- `scripts/site-audit-smoke.mjs`

NPM command:

```bash
npm run site-audit:smoke -- --base-url https://pristupio.netlify.app --token "<JWT>" --root-url "https://example.com"
```

## Zakladny scenar (completed)

```bash
npm run site-audit:smoke -- \
  --base-url https://pristupio.netlify.app \
  --token "<JWT>" \
  --root-url "https://example.com" \
  --mode full \
  --expect-status completed
```

Ocakavanie:

- start vrati `202` alebo `409` (ak uz bezi job)
- polling skonci v `completed`
- result endpoint vrati `auditId` a report summary

## Cancel scenar (cancelled)

```bash
npm run site-audit:smoke -- \
  --base-url https://pristupio.netlify.app \
  --token "<JWT>" \
  --root-url "https://example.com" \
  --cancel-after-ms 7000 \
  --expect-status cancelled
```

Ocakavanie:

- script zavola `audit-site-cancel`
- job sa prepne do `cancelled`

## Failure scenar (failed)

Pouzi URL, pri ktorej crawler zlyha (napr. nestabilny host), potom:

```bash
npm run site-audit:smoke -- \
  --base-url https://pristupio.netlify.app \
  --token "<JWT>" \
  --root-url "http://nonexistent.invalid" \
  --expect-status failed
```

Ocakavanie:

- job skonci v `failed`
- payload obsahuje `error`

## Co sledovat v logoch

- `start_worker_dispatch_retried`
- `status_worker_redrive_dispatched`
- `page_scanned` (`attemptsUsed`, `retriesUsed`)
- `page_scan_failed` (`errorCategory`, retry metadata)
- `crawler_finished` (`processedPerMinute`, `errorBuckets`, `outcome`)

## Manualny checklist dashboardu

- progresbar rastie a nezostava dlho bez zmeny
- pri `running` sa zobrazuje aktualna URL podstranky
- pri `completed` sa zobrazi success modal
- tlacidlo otvorenia reportu prejde na issues panel
- v historii je audit oznaceny ako Site Audit

## Odporucana frekvencia

- po kazdom merge do `main`: aspon `completed` scenar
- pred release: `completed + cancelled + failed`
