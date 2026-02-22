import {
  DEFAULT_ISSUE_LOCALE,
  createIssueCopy,
  normalizeIssueCopyMap,
  normalizeIssueLocale,
  type IssueCopyMap
} from './audit-copy'

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_AI_MODEL = 'gpt-4.1-mini'
const DEFAULT_AI_TIMEOUT_MS = 8_000
const DEFAULT_AI_MAX_ISSUES = 30
const AI_COPY_PROMPT_VERSION = 'ai-copy-sk-v1'

type AiCopyContext = 'audit-run' | 'monitoring-core'

type AiCopyIssue = {
  id: string
  title: string
  description: string
  recommendation: string
  copy?: unknown
  impact?: string
  wcag?: string
  wcagLevel?: string
  principle?: string
  helpUrl?: string
  nodesCount?: number
  nodes?: Array<{
    target?: string[]
    failureSummary?: string
  }>
  [key: string]: unknown
}

type AiIssueCopyInput<TIssue extends AiCopyIssue> = {
  issues: TIssue[]
  locale: unknown
  context: AiCopyContext
}

type AiIssueOutput = {
  id: string
  description: string
  recommendation: string
}

const IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

const parseBoolean = (value: unknown) => {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

const parseLocaleAllowList = (value: unknown) => {
  const raw = typeof value === 'string' ? value : DEFAULT_ISSUE_LOCALE
  const locales = raw
    .split(',')
    .map((item) => normalizeIssueLocale(item, DEFAULT_ISSUE_LOCALE))
    .filter(Boolean)
  return locales.length > 0 ? new Set(locales) : new Set([DEFAULT_ISSUE_LOCALE])
}

const getAiModel = () => {
  const raw = asString(process.env.AUDIT_AI_COPY_MODEL).trim()
  return raw || DEFAULT_AI_MODEL
}

const getAiTimeoutMs = () =>
  clampNumber(process.env.AUDIT_AI_COPY_TIMEOUT_MS, 1_500, 30_000, DEFAULT_AI_TIMEOUT_MS)

const getAiMaxIssues = () =>
  clampNumber(process.env.AUDIT_AI_COPY_MAX_ISSUES, 1, 80, DEFAULT_AI_MAX_ISSUES)

const isAiCopyEnabled = () => parseBoolean(process.env.AUDIT_AI_COPY_ENABLED)

const getPromptVersion = (model: string) => `${AI_COPY_PROMPT_VERSION}:${model}`

const truncate = (text: string, limit: number) => {
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}...`
}

const sanitizeGeneratedText = (value: unknown, maxLength: number) =>
  truncate(normalizeWhitespace(asString(value)), maxLength)

const selectIssuesForAi = <TIssue extends AiCopyIssue>(issues: TIssue[]) => {
  const maxIssues = getAiMaxIssues()
  return [...issues]
    .sort((a, b) => {
      const aOrder = IMPACT_ORDER[asString(a.impact)] ?? 99
      const bOrder = IMPACT_ORDER[asString(b.impact)] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return Number(b.nodesCount || 0) - Number(a.nodesCount || 0)
    })
    .slice(0, maxIssues)
}

const buildIssuePromptInput = (issues: AiCopyIssue[]) => {
  return issues.map((issue) => ({
    id: issue.id,
    impact: asString(issue.impact),
    wcag: asString(issue.wcag),
    wcagLevel: asString(issue.wcagLevel),
    principle: asString(issue.principle),
    nodesCount: Number(issue.nodesCount || 0),
    staticTitle: truncate(normalizeWhitespace(issue.title), 180),
    staticDescription: truncate(normalizeWhitespace(issue.description), 300),
    staticRecommendation: truncate(normalizeWhitespace(issue.recommendation), 300),
    helpUrl: truncate(normalizeWhitespace(asString(issue.helpUrl)), 220),
    sampleSelectors: Array.isArray(issue.nodes)
      ? issue.nodes
          .slice(0, 3)
          .map((node) => (Array.isArray(node?.target) ? node.target.join(' > ') : ''))
          .filter(Boolean)
      : [],
    sampleFailureSummaries: Array.isArray(issue.nodes)
      ? issue.nodes
          .slice(0, 2)
          .map((node) => truncate(normalizeWhitespace(asString(node?.failureSummary)), 180))
          .filter(Boolean)
      : []
  }))
}

const AI_JSON_SCHEMA = {
  name: 'audit_issue_copy',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            recommendation: { type: 'string' }
          },
          required: ['id', 'description', 'recommendation']
        }
      }
    },
    required: ['items']
  }
} as const

const getLocalePrompts = (locale: 'sk' | 'en') => {
  if (locale === 'en') {
    return {
      systemPrompt:
        'You are a senior WCAG consultant. Write a concise issue explanation and recommended remediation steps. ' +
        'Do not invent facts outside the input. No markdown. Explanation 1-2 sentences. Recommendation 2-4 concrete steps. ' +
        'If the input is insufficient, recommend manual verification.',
      language: 'en'
    }
  }

  return {
    systemPrompt:
      'Si senior WCAG konzultant. Vytvor slovenske vysvetlenie problemu a odporucany postup opravy. ' +
      'Nevymyslaj si fakty mimo vstupu. Bez markdownu. Popis 1-2 vety. Odporucanie 2-4 konkretne kroky. ' +
      'Ak vstup nestaci, odporuc manualnu kontrolu.',
    language: 'sk'
  }
}

const buildAiRequestBody = (model: string, issues: AiCopyIssue[], locale: 'sk' | 'en') => {
  const localePrompts = getLocalePrompts(locale)

  const userPrompt = {
    language: localePrompts.language,
    formatRules: {
      descriptionMaxChars: 280,
      recommendationMaxChars: 420
    },
    issues: buildIssuePromptInput(issues)
  }

  return {
    model,
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: AI_JSON_SCHEMA
    },
    messages: [
      { role: 'system', content: localePrompts.systemPrompt },
      { role: 'user', content: JSON.stringify(userPrompt) }
    ]
  }
}

const parseAiItems = (rawContent: unknown): AiIssueOutput[] => {
  if (typeof rawContent !== 'string' || !rawContent.trim()) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    return []
  }

  const rawItems = Array.isArray((parsed as any)?.items) ? (parsed as any).items : []
  const normalized: AiIssueOutput[] = []

  rawItems.forEach((item: any) => {
    const id = normalizeWhitespace(asString(item?.id))
    const description = sanitizeGeneratedText(item?.description, 280)
    const recommendation = sanitizeGeneratedText(item?.recommendation, 420)
    if (!id || !description || !recommendation) return
    normalized.push({ id, description, recommendation })
  })

  return normalized
}

const requestAiCopy = async (params: {
  apiKey: string
  model: string
  timeoutMs: number
  locale: 'sk' | 'en'
  issues: AiCopyIssue[]
  context: AiCopyContext
}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs)

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`
      },
      body: JSON.stringify(buildAiRequestBody(params.model, params.issues, params.locale)),
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text()
      console.warn('[audit-ai-copy] OpenAI request failed', {
        context: params.context,
        status: response.status,
        body: truncate(normalizeWhitespace(text), 350)
      })
      return []
    }

    const payload = (await response.json()) as any
    const content = payload?.choices?.[0]?.message?.content
    const parsedItems = parseAiItems(content)
    return parsedItems
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error')
    console.warn('[audit-ai-copy] OpenAI request error', {
      context: params.context,
      message
    })
    return []
  } finally {
    clearTimeout(timeout)
  }
}

const mergeAiCopyIntoIssue = <TIssue extends AiCopyIssue>(
  issue: TIssue,
  locale: string,
  generated: AiIssueOutput | undefined,
  promptVersion: string
) => {
  if (!generated) return issue

  const copyByLocale = normalizeIssueCopyMap(issue.copy)
  const existingLocaleCopy =
    copyByLocale[locale] ||
    createIssueCopy({
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation
    })

  const nextCopy = createIssueCopy({
    title: existingLocaleCopy.title || issue.title,
    description: generated.description,
    recommendation: generated.recommendation,
    source: 'ai',
    promptVersion
  })

  const mergedCopy: IssueCopyMap = {
    ...copyByLocale,
    [locale]: nextCopy
  }

  return {
    ...issue,
    description: nextCopy.description,
    recommendation: nextCopy.recommendation,
    copy: mergedCopy
  }
}

export const enrichIssuesWithAiCopy = async <TIssue extends AiCopyIssue>({
  issues,
  locale,
  context
}: AiIssueCopyInput<TIssue>): Promise<TIssue[]> => {
  if (!Array.isArray(issues) || issues.length === 0) return issues

  if (!isAiCopyEnabled()) return issues

  const apiKey = asString(process.env.OPENAI_API_KEY).trim()
  if (!apiKey) {
    console.warn('[audit-ai-copy] AUDIT_AI_COPY_ENABLED is true but OPENAI_API_KEY is missing', { context })
    return issues
  }

  const targetLocale = normalizeIssueLocale(locale, DEFAULT_ISSUE_LOCALE)
  const localeAllowList = parseLocaleAllowList(process.env.AUDIT_AI_COPY_LOCALES)
  if (!localeAllowList.has(targetLocale)) return issues

  const aiCandidates = selectIssuesForAi(issues).filter((issue) => !!normalizeWhitespace(issue.id))
  if (aiCandidates.length === 0) return issues

  const model = getAiModel()
  const timeoutMs = getAiTimeoutMs()
  const promptVersion = getPromptVersion(model)

  const aiItems = await requestAiCopy({
    apiKey,
    model,
    timeoutMs,
    locale: targetLocale,
    issues: aiCandidates,
    context
  })

  if (aiItems.length === 0) return issues

  const generatedById = new Map(aiItems.map((item) => [item.id, item]))
  let applied = 0

  const enriched = issues.map((issue) => {
    const generated = generatedById.get(normalizeWhitespace(issue.id))
    if (!generated) return issue
    applied += 1
    return mergeAiCopyIntoIssue(issue, targetLocale, generated, promptVersion)
  })

  console.info('[audit-ai-copy] AI copy applied', {
    context,
    locale: targetLocale,
    requested: aiCandidates.length,
    generated: aiItems.length,
    applied
  })

  return enriched
}
