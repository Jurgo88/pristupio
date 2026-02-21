import { Handler } from '@netlify/functions'
import chromium from '@sparticuz/chromium-min'
import { chromium as playwright } from 'playwright-core'
import axe from 'axe-core'
import { createClient } from '@supabase/supabase-js'
import { getGuidance, getWcagLevel } from './audit-guidance'
import {
  DEFAULT_ISSUE_LOCALE,
  createIssueCopyMap,
  localizeIssues,
  normalizeIssueLocale,
  redactIssueRecommendation,
  type IssueCopyMap
} from './audit-copy'
import { enrichIssuesWithAiCopy } from './audit-ai-copy'

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type Summary = {
  total: number
  byImpact: Record<Impact, number>
}

type ReportIssue = {
  id: string
  title: string
  impact: Impact
  description: string
  recommendation: string
  copy: IssueCopyMap
  wcag: string
  wcagLevel: string
  principle: string
  helpUrl?: string
  nodesCount: number
  nodes: Array<{
    target: string[]
    html: string
    failureSummary?: string
  }>
}

type ProfileRow = {
  plan?: string | null
  free_audit_used?: boolean | null
  paid_audit_completed?: boolean | null
  paid_audit_credits?: number | null
  role?: string | null
}

type AuditRequestBody = {
  url?: unknown
  lang?: unknown
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const RESPONSE_HEADERS = { 'Content-Type': 'application/json' }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] as const

const ERROR_MESSAGES = {
  supabaseConfigMissing: 'Ch\u00fdba konfigur\u00e1cia Supabase.',
  authorizationMissing: 'Ch\u00fdba autoriz\u00e1cia.',
  loginInvalid: 'Neplatn\u00e9 prihl\u00e1senie.',
  invalidBody: 'Neplatn\u00e9 telo po\u017eiadavky.',
  invalidUrl: 'Zadan\u00e1 URL nie je platn\u00e1.',
  paidCreditsMissing: 'Nem\u00e1te kredit na z\u00e1kladn\u00fd audit. Objednajte \u010fal\u0161\u00ed audit.',
  freeAuditAlreadyUsed: 'Bezplatn\u00fd audit u\u017e bol pou\u017eit\u00fd.',
  axeTimeout: 'Vyhodnocovanie pravidiel trvalo pr\u00edli\u0161 dlho.',
  profileInitFailed: 'Profil sa nepodarilo inicializova\u0165.',
  auditInsertFailed: 'Audit sa nepodarilo ulo\u017ei\u0165.',
  auditDetailInsertFailed: 'Detail auditu sa nepodarilo ulo\u017ei\u0165.',
  auditFailed: 'Audit zlyhal.',
  unknownError: 'Nezn\u00e1ma chyba'
} as const

const RESPONSE_META = {
  standard: 'EN 301 549 (WCAG 2.1 AA)',
  tags: AXE_TAGS,
  note: 'Automatizovan\u00e9 testy nepokr\u00fdvaj\u00fa v\u0161etky krit\u00e9ri\u00e1; \u010das\u0165 vy\u017eaduje manu\u00e1lnu kontrolu.'
} as const

const impactOrder: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3
}

const NAVIGATION_TIMEOUT_MS = 45_000
const AXE_RUN_TIMEOUT_MS = 90_000
const NAVIGATION_RETRY_COUNT = 2
const NAVIGATION_RETRY_DELAY_MS = 1_000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  return String(error || ERROR_MESSAGES.unknownError)
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}

const gotoWithRetry = async (page: any, url: string) => {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= NAVIGATION_RETRY_COUNT; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
      return
    } catch (error: unknown) {
      lastError = error
      if (attempt < NAVIGATION_RETRY_COUNT) {
        await delay(NAVIGATION_RETRY_DELAY_MS)
      }
    }
  }

  throw new Error(`Nepodarilo sa na\u010d\u00edta\u0165 str\u00e1nku: ${getErrorMessage(lastError)}`)
}

const jsonResponse = (statusCode: number, payload: Record<string, unknown>) => ({
  statusCode,
  headers: RESPONSE_HEADERS,
  body: JSON.stringify(payload)
})

const errorResponse = (statusCode: number, message: string) => jsonResponse(statusCode, { error: message })

const parseRequestBody = (rawBody?: string | null): AuditRequestBody | null => {
  if (!rawBody) return {}

  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed as AuditRequestBody
  } catch {
    return null
  }
}

const normalizeAuditUrl = (rawUrl: unknown): string | null => {
  if (typeof rawUrl !== 'string') return null

  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

const normalizeImpact = (value?: string): Impact => {
  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return value
  }
  return 'minor'
}

const buildSummary = (issues: ReportIssue[]): Summary => {
  const summary: Summary = {
    total: issues.length,
    byImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    }
  }

  issues.forEach((issue) => {
    summary.byImpact[issue.impact] += 1
  })

  return summary
}

const stripIssueForFree = (issue: ReportIssue): ReportIssue => ({
  ...redactIssueRecommendation(issue, DEFAULT_ISSUE_LOCALE),
  nodes: []
})

const pickTopIssues = (issues: ReportIssue[], count: number) => {
  return [...issues]
    .sort((a, b) => {
      const aOrder = impactOrder[a.impact] ?? 99
      const bOrder = impactOrder[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
    .slice(0, count)
}

export const handler: Handler = async (event) => {
  let browser: Awaited<ReturnType<typeof playwright.launch>> | null = null

  try {
    if (!supabase) {
      return errorResponse(500, ERROR_MESSAGES.supabaseConfigMissing)
    }

    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(401, ERROR_MESSAGES.authorizationMissing)
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return errorResponse(401, ERROR_MESSAGES.loginInvalid)
    }

    const body = parseRequestBody(event.body)
    if (!body) {
      return errorResponse(400, ERROR_MESSAGES.invalidBody)
    }

    const url = normalizeAuditUrl(body.url)
    if (!url) {
      return errorResponse(400, ERROR_MESSAGES.invalidUrl)
    }
    const locale = normalizeIssueLocale(body.lang, DEFAULT_ISSUE_LOCALE)

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan, free_audit_used, paid_audit_completed, paid_audit_credits, role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Profile load error:', profileError)
      return errorResponse(500, ERROR_MESSAGES.profileInitFailed)
    }

    let profile: ProfileRow =
      profileData ||
      ({
        plan: 'free',
        free_audit_used: false,
        paid_audit_completed: false,
        paid_audit_credits: 0,
        role: null
      } as ProfileRow)

    if (!profileData) {
      const { data: insertedProfile, error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          email: userData.user.email || null,
          plan: 'free',
          free_audit_used: false,
          paid_audit_completed: false,
          consent_marketing: false,
          paid_audit_credits: 0
        })
        .select('plan, free_audit_used, paid_audit_completed, paid_audit_credits, role')
        .single()

      if (insertProfileError || !insertedProfile) {
        console.error('Profile create error:', insertProfileError)
        return errorResponse(500, ERROR_MESSAGES.profileInitFailed)
      }

      profile = insertedProfile
    }

    const isAdmin = profile.role === 'admin'
    const isPaid = profile.plan === 'paid' || isAdmin
    const hasFreeAudit = !!profile.free_audit_used
    const paidCredits = Number(profile.paid_audit_credits || 0)

    if (!isAdmin && isPaid && paidCredits <= 0) {
      return errorResponse(403, ERROR_MESSAGES.paidCreditsMissing)
    }

    if (!isPaid && hasFreeAudit) {
      return errorResponse(403, ERROR_MESSAGES.freeAuditAlreadyUsed)
    }

    const isLocal = process.env.NETLIFY_DEV === 'true'

    browser = await playwright.launch({
      args: chromium.args,
      executablePath: isLocal
        ? undefined
        : await chromium.executablePath(
            'https://github.com/sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
          ),
      headless: (chromium as any).headless
    })

    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS)

    await page.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort()
      }
      return route.continue()
    })

    await gotoWithRetry(page, url)

    await page.addScriptTag({ content: axe.source })
    const results = await withTimeout(
      page.evaluate(async (axeTags) => {
        // @ts-ignore
        return await window.axe.run(document, {
          runOnly: {
            type: 'tag',
            values: axeTags
          },
          resultTypes: ['violations']
        })
      }, [...AXE_TAGS]),
      AXE_RUN_TIMEOUT_MS,
      ERROR_MESSAGES.axeTimeout
    )

    let issues = normalizeAuditResults(results)
    if (isPaid) {
      issues = await enrichIssuesWithAiCopy({
        issues,
        locale,
        context: 'audit-run'
      })
    }

    const summary = buildSummary(issues)
    const topIssues = pickTopIssues(issues, 3)

    const report = isPaid
      ? { summary, issues }
      : { summary, issues: topIssues.map(stripIssueForFree) }
    const responseReport = {
      ...report,
      issues: localizeIssues(report.issues, locale, DEFAULT_ISSUE_LOCALE) as ReportIssue[]
    }

    const storedTopIssues = isPaid ? topIssues : topIssues.map(stripIssueForFree)

    const { data: auditInsert, error: auditError } = await supabase
      .from('audits')
      .insert({
        user_id: userData.user.id,
        url,
        audit_kind: isPaid ? 'paid' : 'free',
        summary,
        top_issues: storedTopIssues
      })
      .select('id')
      .single()

    if (auditError || !auditInsert?.id) {
      console.error('Audit insert error:', auditError)
      return errorResponse(500, ERROR_MESSAGES.auditInsertFailed)
    }

    const { error: fullError } = await supabase.from('audit_full').insert({
      audit_id: auditInsert.id,
      user_id: userData.user.id,
      url,
      full_issues: issues
    })

    if (fullError) {
      console.error('Audit full insert error:', fullError)

      const { error: cleanupError } = await supabase.from('audits').delete().eq('id', auditInsert.id)
      if (cleanupError) {
        console.error('Audit cleanup error:', cleanupError)
      }

      return errorResponse(500, ERROR_MESSAGES.auditDetailInsertFailed)
    }

    if (isPaid && !isAdmin) {
      const nextCredits = Math.max(0, paidCredits - 1)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ paid_audit_completed: true, paid_audit_credits: nextCredits })
        .eq('id', userData.user.id)

      if (updateError) {
        console.error('Profile paid-audit update error:', updateError)
      }
    } else if (!isPaid) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ free_audit_used: true })
        .eq('id', userData.user.id)

      if (updateError) {
        console.error('Profile free-audit update error:', updateError)
      }
    }

    return jsonResponse(200, {
      accessLevel: isPaid ? 'paid' : 'free',
      report: responseReport,
      auditId: auditInsert.id,
      meta: {
        ...RESPONSE_META,
        locale
      }
    })
  } catch (error: unknown) {
    const message = getErrorMessage(error) || ERROR_MESSAGES.auditFailed
    console.error('LOG ERROR:', message)

    return errorResponse(500, message)
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Browser close error:', getErrorMessage(closeError))
      }
    }
  }
}

function normalizeAuditResults(results: any): ReportIssue[] {
  const violations = Array.isArray(results?.violations) ? results.violations : []

  return violations.map((v: any) => {
    const impact = normalizeImpact(v.impact)
    const nodes = Array.isArray(v.nodes)
      ? v.nodes.map((n: any) => ({
          target: Array.isArray(n.target) ? n.target : [],
          html: n.html || '',
          failureSummary: n.failureSummary
        }))
      : []

    const guidance = getGuidance(v.id, v.description, v.help)
    const copy = createIssueCopyMap(DEFAULT_ISSUE_LOCALE, {
      title: guidance.title,
      description: guidance.description,
      recommendation: guidance.recommendation
    })

    return {
      id: v.id || v.help || 'unknown',
      title: guidance.title,
      impact,
      description: guidance.description,
      recommendation: guidance.recommendation,
      copy,
      wcag: guidance.wcag,
      wcagLevel: getWcagLevel(v.id, guidance.wcag),
      principle: guidance.principle,
      helpUrl: v.helpUrl,
      nodesCount: nodes.length,
      nodes
    }
  })
}
