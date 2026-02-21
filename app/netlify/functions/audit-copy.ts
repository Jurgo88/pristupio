export const DEFAULT_ISSUE_LOCALE = 'sk' as const
export const ISSUE_COPY_VERSION_STATIC = 'static-v1' as const

const SUPPORTED_LOCALE_PREFIXES = ['sk', 'en'] as const

export type SupportedIssueLocale = (typeof SUPPORTED_LOCALE_PREFIXES)[number]
export type IssueCopySource = 'static' | 'ai'

export type IssueCopy = {
  title: string
  description: string
  recommendation: string
  source: IssueCopySource
  promptVersion: string
  generatedAt: string
}

export type IssueCopyMap = Record<string, IssueCopy>

type LocalizableIssue = {
  title?: unknown
  description?: unknown
  recommendation?: unknown
  copy?: unknown
  [key: string]: unknown
}

const asText = (value: unknown) => (typeof value === 'string' ? value : '')

const normalizeGeneratedAt = (value: unknown) => {
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return new Date().toISOString()
}

const normalizeSource = (value: unknown): IssueCopySource => (value === 'ai' ? 'ai' : 'static')

const normalizeStoredCopy = (value: unknown): IssueCopy | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const raw = value as Record<string, unknown>
  const normalized = createIssueCopy({
    title: raw.title,
    description: raw.description,
    recommendation: raw.recommendation,
    source: normalizeSource(raw.source),
    promptVersion: raw.promptVersion,
    generatedAt: raw.generatedAt
  })

  if (!normalized.title && !normalized.description && !normalized.recommendation) {
    return null
  }

  return normalized
}

export const normalizeIssueLocale = (
  value: unknown,
  fallback: SupportedIssueLocale = DEFAULT_ISSUE_LOCALE
): SupportedIssueLocale => {
  if (typeof value !== 'string') return fallback

  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback

  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('sk')) return 'sk'
  return fallback
}

export const createIssueCopy = ({
  title,
  description,
  recommendation,
  source = 'static',
  promptVersion = ISSUE_COPY_VERSION_STATIC,
  generatedAt
}: {
  title?: unknown
  description?: unknown
  recommendation?: unknown
  source?: IssueCopySource
  promptVersion?: unknown
  generatedAt?: unknown
}): IssueCopy => {
  return {
    title: asText(title),
    description: asText(description),
    recommendation: asText(recommendation),
    source: normalizeSource(source),
    promptVersion: typeof promptVersion === 'string' && promptVersion ? promptVersion : ISSUE_COPY_VERSION_STATIC,
    generatedAt: normalizeGeneratedAt(generatedAt)
  }
}

export const createIssueCopyMap = (
  locale: SupportedIssueLocale,
  values: {
    title?: unknown
    description?: unknown
    recommendation?: unknown
  },
  options?: {
    source?: IssueCopySource
    promptVersion?: string
    generatedAt?: string
  }
): IssueCopyMap => {
  return {
    [locale]: createIssueCopy({
      title: values.title,
      description: values.description,
      recommendation: values.recommendation,
      source: options?.source,
      promptVersion: options?.promptVersion,
      generatedAt: options?.generatedAt
    })
  }
}

export const normalizeIssueCopyMap = (value: unknown): IssueCopyMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const normalized: IssueCopyMap = {}

  Object.entries(value as Record<string, unknown>).forEach(([locale, rawCopy]) => {
    const localeKey = locale.trim().toLowerCase()
    if (!localeKey) return
    const copy = normalizeStoredCopy(rawCopy)
    if (copy) normalized[localeKey] = copy
  })

  return normalized
}

const seedFallbackCopy = (
  issue: LocalizableIssue,
  copyByLocale: IssueCopyMap,
  fallbackLocale: SupportedIssueLocale
) => {
  if (copyByLocale[fallbackLocale]) return

  const seeded = createIssueCopy({
    title: issue.title,
    description: issue.description,
    recommendation: issue.recommendation
  })

  if (!seeded.title && !seeded.description && !seeded.recommendation) return
  copyByLocale[fallbackLocale] = seeded
}

export const localizeIssue = <T extends LocalizableIssue>(
  issue: T,
  localeInput: unknown,
  fallbackLocale: SupportedIssueLocale = DEFAULT_ISSUE_LOCALE
) => {
  const locale = normalizeIssueLocale(localeInput, fallbackLocale)
  const copyByLocale = normalizeIssueCopyMap(issue.copy)
  seedFallbackCopy(issue, copyByLocale, fallbackLocale)

  const firstAvailableLocale = Object.keys(copyByLocale)[0]
  const selectedLocale =
    copyByLocale[locale] ? locale : copyByLocale[fallbackLocale] ? fallbackLocale : firstAvailableLocale || fallbackLocale

  const selectedCopy =
    copyByLocale[selectedLocale] ||
    createIssueCopy({
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation
    })

  if (!copyByLocale[selectedLocale]) {
    copyByLocale[selectedLocale] = selectedCopy
  }

  return {
    ...issue,
    title: selectedCopy.title,
    description: selectedCopy.description,
    recommendation: selectedCopy.recommendation,
    copy: copyByLocale
  } as T & { copy: IssueCopyMap; title: string; description: string; recommendation: string }
}

export const localizeIssues = <T extends LocalizableIssue>(
  issues: T[] | null | undefined,
  localeInput: unknown,
  fallbackLocale: SupportedIssueLocale = DEFAULT_ISSUE_LOCALE
) => {
  if (!Array.isArray(issues)) return []
  return issues.map((issue) => localizeIssue(issue, localeInput, fallbackLocale))
}

export const redactIssueRecommendation = <T extends LocalizableIssue>(
  issue: T,
  fallbackLocale: SupportedIssueLocale = DEFAULT_ISSUE_LOCALE
) => {
  const withCopy = localizeIssue(issue, fallbackLocale, fallbackLocale)
  const redactedCopy: IssueCopyMap = {}

  Object.entries(withCopy.copy || {}).forEach(([locale, copy]) => {
    redactedCopy[locale] = {
      ...copy,
      recommendation: ''
    }
  })

  return {
    ...withCopy,
    recommendation: '',
    copy: redactedCopy
  }
}
