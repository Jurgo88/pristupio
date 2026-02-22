# Audit IssueCopy Contract

This document defines the locale-ready text contract for audit findings.

## Goal

Keep issue metadata deterministic (`impact`, `wcag`, `principle`, `nodesCount`) while making explanatory copy locale-aware and extensible.

## IssueCopy

Each locale-specific issue text is represented by:

```ts
type IssueCopy = {
  title: string
  description: string
  recommendation: string
  source: 'static' | 'ai'
  promptVersion: string
  generatedAt: string
}
```

`copy` is stored as a locale map on each issue:

```ts
type IssueCopyMap = Record<string, IssueCopy>
```

Current default locale is `sk`.

## Fallback Chain

When the requested locale is missing:

1. `copy[requestedLocale]`
2. `copy.sk`
3. first available locale in `copy`
4. top-level `title`/`description`/`recommendation` seeded as static copy

Endpoints then return localized top-level fields while preserving full `copy`.

## Free Audit Redaction

For free audit output, recommendation is redacted in two places:

1. top-level `recommendation`
2. `copy[locale].recommendation` for every locale entry

This keeps paid guidance hidden even if consumer starts reading from `copy`.

## Endpoint Locale Plumbing

`audit-detail` and `audit-latest` support `?lang=...` and return `meta.locale`.

`audit-run` accepts optional `lang` in request body and returns localized top-level fields in `report.issues`.

PDF export supports `lang` in payload and localizes both report UI strings and issue text (from `copy` with fallback).

## AI Copy Generation (PR2)

Paid audit flows can optionally generate Slovak issue copy with OpenAI.

Feature flags (server-side env):

- `AUDIT_AI_COPY_ENABLED` - enable/disable AI generation (`true/false`, default `false`)
- `OPENAI_API_KEY` - OpenAI API key
- `AUDIT_AI_COPY_MODEL` - model name (default `gpt-4.1-mini`)
- `AUDIT_AI_COPY_TIMEOUT_MS` - request timeout in ms (default `8000`)
- `AUDIT_AI_COPY_MAX_ISSUES` - max issues per run sent to AI (default `30`)
- `AUDIT_AI_COPY_LOCALES` - comma-separated locale allowlist (default `sk`)

Behavior:

1. Static guidance is always created first.
2. AI can overwrite `description` + `recommendation` for allowed locales.
3. On OpenAI timeout/error/invalid response, output safely falls back to static copy.
4. Free audit recommendation redaction still applies to both top-level and locale `copy`.
