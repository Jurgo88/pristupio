import chromium from '@sparticuz/chromium-min'
import { chromium as playwright } from 'playwright-core'
import * as axe from 'axe-core'
import {
  createIssueCopyMap,
  DEFAULT_ISSUE_LOCALE
} from './audit-copy'
import {
  claimNextQueuedPage,
  getGuidanceForViolation,
  getMaxLinksPerPage,
  getLiveJobStatus,
  heartbeatJob,
  insertPageIssues,
  markPageDone,
  markPageFailed,
  markPageSkipped,
  queueDiscoveredPages,
  skipRemainingQueuedPages,
  syncJobCounters
} from './audit-site-persistence'
import { isInternalHost, isLikelyCrawlableUrl, normalizeUrlForCrawl } from './audit-site-security'
import {
  type AuditErrorCategory,
  classifyAuditError,
  delay,
  formatCategorizedError,
  getErrorMessage,
  logJson,
  truncateText,
  withTimeout
} from './audit-site-observability'
import {
  AXE_TAGS,
  clampNumber,
  type ReportIssue,
  type ScannedPage,
  type SiteAuditJobRow,
  type SupabaseAdminClient
} from './audit-site-types'

declare const process: {
  env: Record<string, string | undefined>
}

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'

const NAVIGATION_TIMEOUT_MS = clampNumber(process.env.AUDIT_SITE_NAVIGATION_TIMEOUT_MS, 5_000, 240_000, 45_000)
const AXE_RUN_TIMEOUT_MS = clampNumber(process.env.AUDIT_SITE_AXE_TIMEOUT_MS, 10_000, 300_000, 90_000)
const PAGE_SCAN_TIMEOUT_MS = clampNumber(process.env.AUDIT_SITE_PAGE_TIMEOUT_MS, 20_000, 600_000, 90_000)
const PAGE_SCAN_MAX_ATTEMPTS = clampNumber(process.env.AUDIT_SITE_PAGE_RETRIES, 1, 5, 2)
const PAGE_SCAN_BACKOFF_BASE_MS = clampNumber(process.env.AUDIT_SITE_BACKOFF_BASE_MS, 100, 5_000, 700)
const GLOBAL_PAGE_CONCURRENCY_LIMIT = clampNumber(process.env.AUDIT_SITE_PAGE_CONCURRENCY, 1, 8, 2)
const JOB_TIMEOUT_MIN_MS = 15 * 60 * 1_000
const JOB_TIMEOUT_MAX_MS = 4 * 60 * 60 * 1_000
const JOB_TIMEOUT_PER_PAGE_MS = clampNumber(process.env.AUDIT_SITE_JOB_TIMEOUT_PER_PAGE_MS, 5_000, 120_000, 35_000)
const HEARTBEAT_INTERVAL_MS = clampNumber(process.env.AUDIT_SITE_HEARTBEAT_INTERVAL_MS, 1_000, 60_000, 8_000)
const COUNTERS_SYNC_INTERVAL_MS = clampNumber(process.env.AUDIT_SITE_COUNTERS_SYNC_INTERVAL_MS, 500, 20_000, 3_000)
const LIVE_STATUS_REFRESH_INTERVAL_MS = clampNumber(
  process.env.AUDIT_SITE_LIVE_STATUS_REFRESH_INTERVAL_MS,
  500,
  10_000,
  2_000
)
const BLOCK_EXTERNAL_RESOURCES = process.env.AUDIT_SITE_BLOCK_EXTERNAL_RESOURCES === 'true'
const NON_CRITICAL_RESOURCE_TYPES = new Set(['image', 'media', 'font'])
const HTML_CONTENT_TYPE_MARKERS = ['text/html', 'application/xhtml+xml']
const SKIP_SCAN_PREFIX = '[audit][skip]'
const RETRY_TELEMETRY_KEY = '__auditRetryTelemetry'

type RobotsRule = {
  allow: boolean
  path: string
}

type RobotsPolicy = {
  sourceUrl: string
  fetched: boolean
  statusCode: number | null
  isAllowed: (url: string) => boolean
}

type RetryTelemetry = {
  attemptsUsed: number
  retriesUsed: number
  retryBackoffMs: number
  retryCategories: AuditErrorCategory[]
  lastErrorCategory: AuditErrorCategory | null
}

type PageScanWithRetryResult = {
  scannedPage: ScannedPage
  retryTelemetry: RetryTelemetry
}

type CrawlerErrorBuckets = Record<AuditErrorCategory, number>

type CrawlerRunMetrics = {
  pagesScanned: number
  pagesFailed: number
  pagesSkipped: number
  retriesTotal: number
  retryingPages: number
  retryBackoffMsTotal: number
  attemptsTotal: number
  errorBuckets: CrawlerErrorBuckets
}

const createEmptyErrorBuckets = (): CrawlerErrorBuckets => ({
  network: 0,
  parsing: 0,
  audit: 0,
  timeout: 0,
  security: 0,
  unknown: 0
})

const isAuditErrorCategory = (value: unknown): value is AuditErrorCategory => {
  return (
    value === 'network' ||
    value === 'parsing' ||
    value === 'audit' ||
    value === 'timeout' ||
    value === 'security' ||
    value === 'unknown'
  )
}

const createRetryTelemetry = (overrides?: Partial<RetryTelemetry>): RetryTelemetry => ({
  attemptsUsed: Math.max(1, Number(overrides?.attemptsUsed || 1)),
  retriesUsed: Math.max(0, Number(overrides?.retriesUsed || 0)),
  retryBackoffMs: Math.max(0, Number(overrides?.retryBackoffMs || 0)),
  retryCategories: Array.isArray(overrides?.retryCategories)
    ? overrides.retryCategories.filter((item) => isAuditErrorCategory(item))
    : [],
  lastErrorCategory: isAuditErrorCategory(overrides?.lastErrorCategory) ? overrides.lastErrorCategory : null
})

const withRetryTelemetry = (error: unknown, telemetry: RetryTelemetry) => {
  const wrapped = error instanceof Error ? error : new Error(getErrorMessage(error))
  ;(wrapped as any)[RETRY_TELEMETRY_KEY] = telemetry
  return wrapped
}

const getRetryTelemetry = (error: unknown): RetryTelemetry => {
  const raw = error && typeof error === 'object' ? (error as any)[RETRY_TELEMETRY_KEY] : null
  if (!raw || typeof raw !== 'object') return createRetryTelemetry()

  return createRetryTelemetry({
    attemptsUsed: Number(raw.attemptsUsed || 1),
    retriesUsed: Number(raw.retriesUsed || 0),
    retryBackoffMs: Number(raw.retryBackoffMs || 0),
    retryCategories: Array.isArray(raw.retryCategories) ? raw.retryCategories : [],
    lastErrorCategory: raw.lastErrorCategory
  })
}

const createCrawlerRunMetrics = (): CrawlerRunMetrics => ({
  pagesScanned: 0,
  pagesFailed: 0,
  pagesSkipped: 0,
  retriesTotal: 0,
  retryingPages: 0,
  retryBackoffMsTotal: 0,
  attemptsTotal: 0,
  errorBuckets: createEmptyErrorBuckets()
})

const applyRetryTelemetryToMetrics = (metrics: CrawlerRunMetrics, telemetry: RetryTelemetry) => {
  metrics.attemptsTotal += Math.max(1, Number(telemetry.attemptsUsed || 1))
  metrics.retriesTotal += Math.max(0, Number(telemetry.retriesUsed || 0))
  metrics.retryBackoffMsTotal += Math.max(0, Number(telemetry.retryBackoffMs || 0))
  if (Number(telemetry.retriesUsed || 0) > 0) {
    metrics.retryingPages += 1
  }
}

const incrementErrorBucket = (buckets: CrawlerErrorBuckets, category: AuditErrorCategory) => {
  buckets[category] = Math.max(0, Number(buckets[category] || 0)) + 1
}

const roundMetric = (value: number, fractionDigits = 2) => {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** Math.max(0, fractionDigits)
  return Math.round(value * factor) / factor
}

const toPerMinute = (count: number, durationMs: number) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0
  return roundMetric((Math.max(0, Number(count || 0)) * 60_000) / durationMs, 2)
}

const parseRobots = (content: string) => {
  const lines = content.split(/\r?\n/)
  const rulesByAgent = new Map<string, RobotsRule[]>()

  let currentAgents: string[] = []
  let lastDirectiveType: 'user-agent' | 'rule' | 'other' = 'other'
  for (const lineRaw of lines) {
    const commentCut = lineRaw.split('#')[0] || ''
    const line = commentCut.trim()
    if (!line) continue

    const separator = line.indexOf(':')
    if (separator < 0) continue

    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (!value && key !== 'disallow' && key !== 'allow') continue

    if (key === 'user-agent') {
      const ua = value.toLowerCase()
      if (!ua) {
        currentAgents = []
        lastDirectiveType = 'user-agent'
        continue
      }

      // Consecutive user-agent lines belong to the same group.
      if (lastDirectiveType === 'user-agent' && currentAgents.length > 0) {
        if (!currentAgents.includes(ua)) {
          currentAgents.push(ua)
        }
      } else {
        currentAgents = [ua]
      }
      if (ua && !rulesByAgent.has(ua)) {
        rulesByAgent.set(ua, [])
      }
      lastDirectiveType = 'user-agent'
      continue
    }

    if (key !== 'allow' && key !== 'disallow') {
      lastDirectiveType = 'other'
      continue
    }
    if (currentAgents.length === 0) continue

    // robots.txt semantics:
    // - "Disallow:" with empty value means no restriction
    // - "Allow:" with empty value is a no-op
    if (!value) {
      lastDirectiveType = 'rule'
      continue
    }

    const rule: RobotsRule = {
      allow: key === 'allow',
      path: value
    }

    for (const ua of currentAgents) {
      const list = rulesByAgent.get(ua) || []
      list.push(rule)
      rulesByAgent.set(ua, list)
    }
    lastDirectiveType = 'rule'
  }

  return rulesByAgent
}

const createRobotsPolicyFromRules = (sourceUrl: string, statusCode: number | null, rulesByAgent: Map<string, RobotsRule[]>) => {
  const botRules = rulesByAgent.get('pristupioauditbot') || []
  const wildcardRules = rulesByAgent.get('*') || []
  const rules = [...botRules, ...wildcardRules]

  const isAllowed = (rawUrl: string) => {
    if (!rules.length) return true

    let targetPath = '/'
    try {
      const parsed = new URL(rawUrl)
      targetPath = `${parsed.pathname || '/'}${parsed.search || ''}`
    } catch {
      return false
    }

    let bestMatch: { length: number; allow: boolean } | null = null
    for (const rule of rules) {
      const rawPath = (rule.path || '/').trim()
      if (!rawPath || rawPath === '/') {
        if (!bestMatch || bestMatch.length < 1) {
          bestMatch = { length: 1, allow: rule.allow }
        }
        continue
      }
      if (!targetPath.startsWith(rawPath)) continue

      const length = rawPath.length
      if (!bestMatch || length > bestMatch.length || (length === bestMatch.length && rule.allow)) {
        bestMatch = { length, allow: rule.allow }
      }
    }

    if (!bestMatch) return true
    return bestMatch.allow
  }

  return {
    sourceUrl,
    fetched: true,
    statusCode,
    isAllowed
  } satisfies RobotsPolicy
}

const buildAllowAllRobotsPolicy = (sourceUrl: string, statusCode: number | null): RobotsPolicy => ({
  sourceUrl,
  fetched: false,
  statusCode,
  isAllowed: () => true
})

const fetchRobotsPolicy = async (rootUrl: string): Promise<RobotsPolicy> => {
  const origin = new URL(rootUrl).origin
  const robotsUrl = `${origin}/robots.txt`

  try {
    const response = await withTimeout(
      fetch(robotsUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'PristupioAuditBot/1.0 (+https://pristupio.com)'
        }
      }),
      8_000,
      'robots.txt request timeout'
    )

    if (!response.ok) {
      return buildAllowAllRobotsPolicy(robotsUrl, response.status)
    }

    const text = await response.text()
    const rules = parseRobots(text || '')
    return createRobotsPolicyFromRules(robotsUrl, response.status, rules)
  } catch (error) {
    logJson('warn', 'robots_fetch_failed', {
      rootUrl,
      robotsUrl,
      error: getErrorMessage(error)
    })
    return buildAllowAllRobotsPolicy(robotsUrl, null)
  }
}

const normalizeImpact = (value?: string) => {
  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return value
  }
  return 'minor'
}

const normalizeRuleId = (value: unknown) => {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.trim().toLowerCase()
  return normalized || 'unknown'
}

const createSkipScanError = (reason: string) => {
  return new Error(`${SKIP_SCAN_PREFIX} ${reason}`.trim())
}

const isSkipScanError = (error: unknown) => {
  return getErrorMessage(error).toLowerCase().includes(SKIP_SCAN_PREFIX)
}

const toSkipPageMessage = (error: unknown) => {
  const message = getErrorMessage(error).replace(/\[audit\]\[skip\]\s*/gi, '[audit] ').trim()
  return message || '[audit] Stranka bola preskocena.'
}

const normalizeAuditResults = (results: any): ReportIssue[] => {
  const violations = Array.isArray(results?.violations) ? results.violations : []

  return violations.map((violation: any) => {
    const nodes = Array.isArray(violation.nodes)
      ? violation.nodes.map((node: any) => ({
          target: Array.isArray(node?.target) ? node.target : [],
          html: truncateText(node?.html || '', 1_500),
          failureSummary: truncateText(node?.failureSummary || '', 300)
        }))
      : []

    const guidance = getGuidanceForViolation(violation.id, violation.description, violation.help)
    const copy = createIssueCopyMap(DEFAULT_ISSUE_LOCALE, {
      title: guidance.title,
      description: guidance.description,
      recommendation: guidance.recommendation
    })

    return {
      id: normalizeRuleId(violation.id || violation.help || 'unknown'),
      title: guidance.title,
      impact: normalizeImpact(violation.impact),
      description: guidance.description,
      recommendation: guidance.recommendation,
      copy,
      wcag: guidance.wcag,
      wcagLevel: guidance.wcagLevel,
      principle: guidance.principle,
      helpUrl: violation.helpUrl,
      nodesCount: nodes.length,
      nodes
    } satisfies ReportIssue
  })
}

const discoverInternalLinks = async (
  page: any,
  currentUrl: string,
  rootHost: string,
  robotsPolicy: RobotsPolicy
) => {
  const rawLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
    return anchors.map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href') || '')
  })

  const discovered = new Set<string>()
  const maxLinks = getMaxLinksPerPage()
  for (const rawLink of rawLinks) {
    if (typeof rawLink !== 'string') continue
    const trimmed = rawLink.trim()
    if (!trimmed) continue

    const lowered = trimmed.toLowerCase()
    if (lowered.startsWith('javascript:') || lowered.startsWith('mailto:') || lowered.startsWith('tel:')) continue

    try {
      const parsed = new URL(trimmed, currentUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
      if (!isInternalHost(parsed.host, rootHost)) continue

      if (!isLikelyCrawlableUrl(parsed.toString())) continue

      const normalized = normalizeUrlForCrawl(parsed.toString())
      if (!robotsPolicy.isAllowed(normalized)) continue
      discovered.add(normalized)
      if (discovered.size >= maxLinks) break
    } catch {
      // ignore malformed links
    }
  }

  return Array.from(discovered)
}

const scanSinglePageOnce = async (
  page: any,
  url: string,
  rootHost: string,
  robotsPolicy: RobotsPolicy
): Promise<ScannedPage> => {
  if (!robotsPolicy.isAllowed(url)) {
    throw new Error('Blocked by robots.txt policy.')
  }

  const startedAt = Date.now()
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  const finalUrlRaw = page.url()
  const finalUrl = normalizeUrlForCrawl(finalUrlRaw || url)
  const finalHost = new URL(finalUrl).host.toLowerCase()
  if (!isInternalHost(finalHost, rootHost)) {
    throw new Error('Navigation left the target domain.')
  }

  if (!isLikelyCrawlableUrl(finalUrl)) {
    throw createSkipScanError(`Final URL nie je vhodna na crawl (${finalUrl}).`)
  }

  const contentType = String(response?.headers()?.['content-type'] || '').toLowerCase()
  if (contentType && !HTML_CONTENT_TYPE_MARKERS.some((marker) => contentType.includes(marker))) {
    throw createSkipScanError(`Nepodporovany content-type: ${truncateText(contentType, 120)}`)
  }

  const results = await withTimeout(
    page.evaluate(async (axeTags) => {
      // @ts-ignore
      if (!window.axe || typeof window.axe.run !== 'function') {
        throw new Error('Axe runtime missing on page.')
      }
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
    'Axe evaluation timeout.'
  )

  const discoveredUrls = await discoverInternalLinks(page, finalUrl, rootHost, robotsPolicy)
  return {
    url: finalUrl,
    normalizedUrl: normalizeUrlForCrawl(finalUrl),
    httpStatus: response ? Number(response.status()) : null,
    loadMs: Date.now() - startedAt,
    issues: normalizeAuditResults(results),
    discoveredUrls
  }
}

const isRetryableCategory = (category: ReturnType<typeof classifyAuditError>) => {
  return category === 'network' || category === 'timeout'
}

const scanSinglePageWithRetry = async (
  page: any,
  url: string,
  rootHost: string,
  robotsPolicy: RobotsPolicy
): Promise<PageScanWithRetryResult> => {
  let lastError: unknown = null
  let retriesUsed = 0
  let retryBackoffMs = 0
  const retryCategories: AuditErrorCategory[] = []

  for (let attempt = 1; attempt <= PAGE_SCAN_MAX_ATTEMPTS; attempt += 1) {
    try {
      const scanned = await withTimeout(
        scanSinglePageOnce(page, url, rootHost, robotsPolicy),
        PAGE_SCAN_TIMEOUT_MS,
        'Page scan timeout.'
      )
      return {
        scannedPage: scanned,
        retryTelemetry: createRetryTelemetry({
          attemptsUsed: attempt,
          retriesUsed,
          retryBackoffMs,
          retryCategories,
          lastErrorCategory: null
        })
      }
    } catch (error) {
      lastError = error
      const category = classifyAuditError(error)
      if (!isRetryableCategory(category) || attempt >= PAGE_SCAN_MAX_ATTEMPTS) {
        throw withRetryTelemetry(
          error,
          createRetryTelemetry({
            attemptsUsed: attempt,
            retriesUsed,
            retryBackoffMs,
            retryCategories,
            lastErrorCategory: category
          })
        )
      }

      retriesUsed += 1
      retryCategories.push(category)
      const jitter = Math.floor(Math.random() * 200)
      const backoff = Math.min(20_000, PAGE_SCAN_BACKOFF_BASE_MS * 2 ** (attempt - 1) + jitter)
      retryBackoffMs += backoff
      await delay(backoff)
    }
  }

  throw withRetryTelemetry(
    lastError || new Error('Page scan failed.'),
    createRetryTelemetry({
      attemptsUsed: Math.max(1, PAGE_SCAN_MAX_ATTEMPTS),
      retriesUsed,
      retryBackoffMs,
      retryCategories,
      lastErrorCategory: lastError ? classifyAuditError(lastError) : 'unknown'
    })
  )
}

const getPageConcurrency = (job: SiteAuditJobRow) => {
  const byMode = job.mode === 'full' ? 3 : 2
  return Math.max(1, Math.min(byMode, GLOBAL_PAGE_CONCURRENCY_LIMIT))
}

const getJobTimeoutMs = (job: SiteAuditJobRow) => {
  const estimated = Math.max(1, Number(job.pages_limit || 1)) * JOB_TIMEOUT_PER_PAGE_MS
  return Math.max(JOB_TIMEOUT_MIN_MS, Math.min(JOB_TIMEOUT_MAX_MS, estimated))
}

const isHeartbeatDue = (lastHeartbeatAt: number) => Date.now() - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS

export const runSiteAuditCrawler = async (supabase: SupabaseAdminClient, job: SiteAuditJobRow) => {
  const runStartedAt = Date.now()
  let browser: Awaited<ReturnType<typeof playwright.launch>> | null = null
  const initialRootHost = new URL(job.root_url).host.toLowerCase()
  let canonicalRootHost = initialRootHost
  const jobDeadlineAt = Date.now() + getJobTimeoutMs(job)
  const robotsPolicy = await fetchRobotsPolicy(job.root_url)
  const pageConcurrency = getPageConcurrency(job)
  const metrics = createCrawlerRunMetrics()
  let runOutcome: 'completed' | 'cancelled' | 'timeout' | 'failed' = 'failed'
  let runError: unknown = null

  logJson('info', 'crawler_started', {
    jobId: job.id,
    rootUrl: job.root_url,
    mode: job.mode,
    pagesLimit: job.pages_limit,
    maxDepth: job.max_depth,
    rootHost: initialRootHost,
    pageConcurrency,
    retryMaxAttempts: PAGE_SCAN_MAX_ATTEMPTS,
    pageScanTimeoutMs: PAGE_SCAN_TIMEOUT_MS,
    navigationTimeoutMs: NAVIGATION_TIMEOUT_MS,
    axeTimeoutMs: AXE_RUN_TIMEOUT_MS,
    robotsSource: robotsPolicy.sourceUrl,
    robotsFetched: robotsPolicy.fetched,
    robotsStatusCode: robotsPolicy.statusCode
  })

  let cancelRequested = false
  let timeoutTriggered = false
  let lastHeartbeatAt = 0
  let countersSnapshot = {
    pagesQueued: Math.max(0, Number(job.pages_queued || 0)),
    pagesScanned: Math.max(0, Number(job.pages_scanned || 0)),
    pagesFailed: Math.max(0, Number(job.pages_failed || 0))
  }
  let lastCountersSyncAt = 0
  let countersSyncPromise: Promise<typeof countersSnapshot> | null = null
  let liveJobStatus = String(job.status || 'running')
  let lastLiveStatusAt = 0
  let liveStatusPromise: Promise<string> | null = null

  const syncCounters = async (force = false) => {
    const now = Date.now()
    if (!force && now - lastCountersSyncAt < COUNTERS_SYNC_INTERVAL_MS) {
      return countersSnapshot
    }
    if (countersSyncPromise) {
      return countersSyncPromise
    }

    countersSyncPromise = (async () => {
      const synced = await syncJobCounters(supabase, job.id)
      countersSnapshot = {
        pagesQueued: Math.max(0, Number(synced.pagesQueued || 0)),
        pagesScanned: Math.max(0, Number(synced.pagesScanned || 0)),
        pagesFailed: Math.max(0, Number(synced.pagesFailed || 0))
      }
      lastCountersSyncAt = Date.now()
      return countersSnapshot
    })()

    try {
      return await countersSyncPromise
    } finally {
      countersSyncPromise = null
    }
  }

  const refreshLiveStatus = async (force = false) => {
    const now = Date.now()
    if (!force && now - lastLiveStatusAt < LIVE_STATUS_REFRESH_INTERVAL_MS) {
      return liveJobStatus
    }
    if (liveStatusPromise) {
      return liveStatusPromise
    }

    liveStatusPromise = (async () => {
      const live = await getLiveJobStatus(supabase, job.id)
      liveJobStatus = String(live?.status || liveJobStatus || 'running')
      lastLiveStatusAt = Date.now()
      return liveJobStatus
    })()

    try {
      return await liveStatusPromise
    } finally {
      liveStatusPromise = null
    }
  }

  try {
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

    const context = await browser.newContext({
      userAgent: 'PristupioAuditBot/1.0 (+https://pristupio.com)',
      javaScriptEnabled: true
    })
    await context.addInitScript({ content: axe.source })

    await context.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (NON_CRITICAL_RESOURCE_TYPES.has(type)) {
        return route.abort()
      }

      if (BLOCK_EXTERNAL_RESOURCES && type !== 'document') {
        try {
          const requestHost = new URL(route.request().url()).host.toLowerCase()
          if (requestHost && !isInternalHost(requestHost, canonicalRootHost)) {
            return route.abort()
          }
        } catch {
          return route.abort()
        }
      }

      return route.continue()
    })

    const worker = async (workerIndex: number) => {
      const page = await context.newPage()
      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)
      page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS)

      try {
        while (!cancelRequested && !timeoutTriggered) {
          if (Date.now() > jobDeadlineAt) {
            timeoutTriggered = true
            break
          }

          if (isHeartbeatDue(lastHeartbeatAt)) {
            await heartbeatJob(supabase, job.id)
            lastHeartbeatAt = Date.now()
          }

          const liveStatus = await refreshLiveStatus()
          if (liveStatus === 'cancelled') {
            cancelRequested = true
            break
          }
          if (liveStatus === 'failed') {
            cancelRequested = true
            break
          }

          await syncCounters()
          const processed = countersSnapshot.pagesScanned + countersSnapshot.pagesFailed
          if (processed >= Number(job.pages_limit || 0)) {
            await skipRemainingQueuedPages(supabase, job.id, 'Page limit reached.')
            await syncCounters(true)
            break
          }

          const nextPage = await claimNextQueuedPage(supabase, job.id)
          if (!nextPage?.id) break
          countersSnapshot.pagesQueued = Math.max(0, countersSnapshot.pagesQueued - 1)

          if (Number(nextPage.depth || 0) > Number(job.max_depth || 0)) {
            await markPageSkipped(supabase, nextPage.id, '[audit] Depth limit reached.')
            metrics.pagesSkipped += 1
            continue
          }

          if (!robotsPolicy.isAllowed(nextPage.url)) {
            await markPageSkipped(supabase, nextPage.id, '[audit] Skipped by robots.txt policy.')
            metrics.pagesSkipped += 1
            continue
          }

          try {
            const { scannedPage, retryTelemetry } = await scanSinglePageWithRetry(
              page,
              nextPage.url,
              canonicalRootHost,
              robotsPolicy
            )
            applyRetryTelemetryToMetrics(metrics, retryTelemetry)
            if (Number(nextPage.depth || 0) === 0) {
              const scannedHost = new URL(scannedPage.url).host.toLowerCase()
              if (scannedHost !== canonicalRootHost && isInternalHost(scannedHost, canonicalRootHost)) {
                canonicalRootHost = scannedHost
                logJson('info', 'crawler_canonical_host_updated', {
                  jobId: job.id,
                  fromHost: initialRootHost,
                  toHost: canonicalRootHost
                })
              }
            }
            await insertPageIssues(supabase, job.id, nextPage.id, scannedPage.issues)
            const discoveredCount = await queueDiscoveredPages(supabase, job, nextPage, scannedPage.discoveredUrls)
            if (discoveredCount > 0) {
              countersSnapshot.pagesQueued += discoveredCount
            }
            await markPageDone(supabase, nextPage.id, {
              url: scannedPage.url,
              normalizedUrl: scannedPage.normalizedUrl,
              httpStatus: scannedPage.httpStatus,
              loadMs: scannedPage.loadMs,
              issuesCount: scannedPage.issues.length
            })
            countersSnapshot.pagesScanned += 1
            metrics.pagesScanned += 1

            logJson('info', 'page_scanned', {
              jobId: job.id,
              pageId: nextPage.id,
              workerIndex,
              depth: nextPage.depth,
              url: scannedPage.url,
              issues: scannedPage.issues.length,
              discovered: scannedPage.discoveredUrls.length,
              loadMs: scannedPage.loadMs,
              attemptsUsed: retryTelemetry.attemptsUsed,
              retriesUsed: retryTelemetry.retriesUsed,
              retryBackoffMs: retryTelemetry.retryBackoffMs
            })
          } catch (scanError) {
            if (isSkipScanError(scanError)) {
              const skippedMessage = truncateText(toSkipPageMessage(scanError), 600)
              await markPageSkipped(supabase, nextPage.id, skippedMessage)
              metrics.pagesSkipped += 1
              logJson('info', 'page_scan_skipped_runtime', {
                jobId: job.id,
                pageId: nextPage.id,
                workerIndex,
                url: nextPage.url,
                reason: truncateText(getErrorMessage(scanError), 450)
              })
              continue
            }

            const categorized = formatCategorizedError(scanError)
            await markPageFailed(supabase, nextPage.id, truncateText(categorized.message, 600))
            countersSnapshot.pagesFailed += 1
            metrics.pagesFailed += 1
            const retryTelemetry = getRetryTelemetry(scanError)
            applyRetryTelemetryToMetrics(metrics, retryTelemetry)
            incrementErrorBucket(metrics.errorBuckets, categorized.category)
            logJson('warn', 'page_scan_failed', {
              jobId: job.id,
              pageId: nextPage.id,
              workerIndex,
              url: nextPage.url,
              errorCategory: categorized.category,
              error: truncateText(getErrorMessage(scanError), 450),
              attemptsUsed: retryTelemetry.attemptsUsed,
              retriesUsed: retryTelemetry.retriesUsed,
              retryBackoffMs: retryTelemetry.retryBackoffMs
            })
          }
        }
      } finally {
        await page.close({ runBeforeUnload: false }).catch(() => undefined)
      }
    }

    await Promise.all(Array.from({ length: pageConcurrency }, (_item, index) => worker(index + 1)))
    await syncCounters(true)

    if (timeoutTriggered) {
      runOutcome = 'timeout'
      throw new Error('[timeout] Job exceeded execution watchdog limit.')
    }

    runOutcome = cancelRequested ? 'cancelled' : 'completed'
    return { cancelled: cancelRequested }
  } catch (error) {
    runError = error
    if (runOutcome !== 'timeout') {
      runOutcome = 'failed'
    }
    throw error
  } finally {
    const runDurationMs = Math.max(1, Date.now() - runStartedAt)
    const processedPages = metrics.pagesScanned + metrics.pagesFailed
    const infoPayload: Record<string, unknown> = {
      jobId: job.id,
      outcome: runOutcome,
      durationMs: runDurationMs,
      pagesScanned: metrics.pagesScanned,
      pagesFailed: metrics.pagesFailed,
      pagesSkipped: metrics.pagesSkipped,
      processedPages,
      pagesQueued: countersSnapshot.pagesQueued,
      retriesTotal: metrics.retriesTotal,
      retryingPages: metrics.retryingPages,
      retryBackoffMsTotal: metrics.retryBackoffMsTotal,
      avgAttemptsPerProcessedPage:
        processedPages > 0 ? roundMetric(metrics.attemptsTotal / processedPages, 2) : 0,
      scannedPerMinute: toPerMinute(metrics.pagesScanned, runDurationMs),
      processedPerMinute: toPerMinute(processedPages, runDurationMs),
      errorBuckets: metrics.errorBuckets
    }

    if (runError) {
      infoPayload.errorCategory = classifyAuditError(runError)
      infoPayload.error = truncateText(getErrorMessage(runError), 450)
    }

    const finishLevel = runOutcome === 'completed' || runOutcome === 'cancelled' ? 'info' : 'warn'
    logJson(finishLevel, 'crawler_finished', infoPayload)

    if (browser) {
      await browser.close().catch((closeError) => {
        logJson('warn', 'browser_close_failed', {
          jobId: job.id,
          error: getErrorMessage(closeError)
        })
      })
    }
  }
}
