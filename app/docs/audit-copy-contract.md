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
