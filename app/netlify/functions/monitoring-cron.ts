import { Handler } from '@netlify/functions'
import chromium from '@sparticuz/chromium-min'
import { chromium as playwright } from 'playwright-core'
import * as axe from 'axe-core'
import { createClient } from '@supabase/supabase-js'

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type MonitoringIssue = {
  id: string
  title: string
  impact: Impact
  nodesCount: number
  helpUrl?: string
}

type MonitoringSummary = {
  total: number
  byImpact: Record<Impact, number>
}

type MonitoringTarget = {
  id: string
  user_id: string
  url: string
  frequency_days: number
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const batchSize = Number(process.env.MONITORING_BATCH_SIZE || 5)

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

export const config = { schedule: '0 */6 * * *' }

const impactOrder: Record<Impact, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3
}

const normalizeImpact = (value?: string): Impact => {
  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return value
  }
  return 'minor'
}

const buildSummary = (issues: MonitoringIssue[]): MonitoringSummary => {
  const summary: MonitoringSummary = {
    total: issues.length,
    byImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    }
  }

  for (const issue of issues) {
    summary.byImpact[issue.impact] += 1
  }

  return summary
}

const calculateScore = (summary: MonitoringSummary) => {
  const byImpact = summary.byImpact
  const total =
    (byImpact.critical || 0) + (byImpact.serious || 0) + (byImpact.moderate || 0) + (byImpact.minor || 0)
  if (total === 0) return 100

  const penalty =
    (byImpact.critical || 0) * 18 +
    (byImpact.serious || 0) * 10 +
    (byImpact.moderate || 0) * 5 +
    (byImpact.minor || 0) * 2

  const score = 100 / (1 + penalty / 60)
  return Math.max(0, Math.round(score))
}

const pickTopIssues = (issues: MonitoringIssue[], count: number) => {
  return [...issues]
    .sort((a, b) => {
      const aOrder = impactOrder[a.impact] ?? 99
      const bOrder = impactOrder[b.impact] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return (b.nodesCount || 0) - (a.nodesCount || 0)
    })
    .slice(0, count)
}

const clampFrequencyDays = (value: number) => {
  if (!Number.isFinite(value)) return 14
  return Math.min(30, Math.max(1, Math.round(value)))
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const computeDelta = (previous: any, currentSummary: MonitoringSummary, currentScore: number) => {
  if (!previous) {
    return {
      firstRun: true,
      scoreDiff: 0,
      totalDiff: 0,
      criticalDiff: 0,
      seriousDiff: 0,
      moderateDiff: 0,
      minorDiff: 0
    }
  }

  const previousSummary = previous.summary || {
    total: 0,
    byImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 }
  }

  return {
    firstRun: false,
    scoreDiff: currentScore - Number(previous.score || 0),
    totalDiff: Number(currentSummary.total || 0) - Number(previousSummary.total || 0),
    criticalDiff:
      Number(currentSummary.byImpact?.critical || 0) - Number(previousSummary.byImpact?.critical || 0),
    seriousDiff:
      Number(currentSummary.byImpact?.serious || 0) - Number(previousSummary.byImpact?.serious || 0),
    moderateDiff:
      Number(currentSummary.byImpact?.moderate || 0) - Number(previousSummary.byImpact?.moderate || 0),
    minorDiff: Number(currentSummary.byImpact?.minor || 0) - Number(previousSummary.byImpact?.minor || 0)
  }
}

const runMonitoringScan = async (
  browser: Awaited<ReturnType<typeof playwright.launch>>,
  url: string
) => {
  const page = await browser.newPage()
  try {
    page.setDefaultNavigationTimeout(45000)
    await page.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort()
      }
      return route.continue()
    })

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.addScriptTag({ content: axe.source })

    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        },
        resultTypes: ['violations', 'incomplete', 'passes', 'inapplicable']
      })
    })

    const violations = Array.isArray(results?.violations) ? results.violations : []
    const issues: MonitoringIssue[] = violations.map((violation: any) => ({
      id: violation.id || violation.help || 'unknown',
      title: violation.help || violation.id || 'Unknown issue',
      impact: normalizeImpact(violation.impact),
      helpUrl: violation.helpUrl,
      nodesCount: Array.isArray(violation.nodes) ? violation.nodes.length : 0
    }))

    const summary = buildSummary(issues)
    const score = calculateScore(summary)
    const topIssues = pickTopIssues(issues, 5)

    return { summary, score, topIssues }
  } finally {
    await page.close().catch(() => undefined)
  }
}

const disableTargetForPlan = async (targetId: string) => {
  const nowIso = new Date().toISOString()
  await supabase
    ?.from('monitor_targets')
    .update({
      active: false,
      last_status: 'disabled',
      last_error: 'Monitoring plan inactive.',
      updated_at: nowIso
    })
    .eq('id', targetId)
}

export const handler: Handler = async () => {
  try {
    if (!supabase) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase config missing.' }) }
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const maxBatch = Math.min(25, Math.max(1, Number.isFinite(batchSize) ? Math.round(batchSize) : 5))

    const { data: dueTargets, error: targetsError } = await supabase
      .from('monitor_targets')
      .select('id, user_id, url, frequency_days')
      .eq('active', true)
      .lte('next_run_at', nowIso)
      .order('next_run_at', { ascending: true })
      .limit(maxBatch)

    if (targetsError) {
      console.error('Monitoring cron target load error:', targetsError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie monitoring targetov zlyhalo.' }) }
    }

    const targets: MonitoringTarget[] = Array.isArray(dueTargets) ? dueTargets : []
    if (targets.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processed: 0, failed: 0, skipped: 0, message: 'No due targets.' })
      }
    }

    const userIds = Array.from(new Set(targets.map((target) => target.user_id)))
    const { data: profiles } = await supabase.from('profiles').select('id, plan, role').in('id', userIds)
    const profileMap = new Map(
      (profiles || []).map((profile: any) => [profile.id, profile.plan === 'paid' || profile.role === 'admin'])
    )

    const isLocal = process.env.NETLIFY_DEV === 'true'
    const browser = await playwright.launch({
      args: chromium.args,
      executablePath: isLocal
        ? undefined
        : await chromium.executablePath(
            'https://github.com/sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
          ),
      headless: true
    })

    let processed = 0
    let failed = 0
    let skipped = 0

    try {
      for (const target of targets) {
        const canRunForUser = profileMap.get(target.user_id)
        if (!canRunForUser) {
          skipped += 1
          await disableTargetForPlan(target.id)
          continue
        }

        const startedAt = new Date().toISOString()

        try {
          const scan = await runMonitoringScan(browser, target.url)
          const completedAt = new Date().toISOString()

          const { data: previousRun } = await supabase
            .from('monitor_runs')
            .select('score, summary')
            .eq('target_id', target.id)
            .eq('status', 'success')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const delta = computeDelta(previousRun || null, scan.summary, scan.score)

          await supabase.from('monitor_runs').insert({
            target_id: target.id,
            user_id: target.user_id,
            status: 'success',
            score: scan.score,
            summary: scan.summary,
            top_issues: scan.topIssues,
            delta,
            started_at: startedAt,
            completed_at: completedAt
          })

          const frequencyDays = clampFrequencyDays(Number(target.frequency_days || 14))
          const nextRunAt = addDays(new Date(), frequencyDays).toISOString()

          await supabase
            .from('monitor_targets')
            .update({
              last_run_at: completedAt,
              last_status: 'success',
              last_error: null,
              next_run_at: nextRunAt,
              updated_at: completedAt
            })
            .eq('id', target.id)

          processed += 1
        } catch (targetError: any) {
          failed += 1
          const message = String(targetError?.message || 'Monitoring run failed.')
          const completedAt = new Date().toISOString()

          await supabase.from('monitor_runs').insert({
            target_id: target.id,
            user_id: target.user_id,
            status: 'failed',
            error: message,
            started_at: startedAt,
            completed_at: completedAt
          })

          await supabase
            .from('monitor_targets')
            .update({
              last_run_at: completedAt,
              last_status: 'failed',
              last_error: message,
              next_run_at: addDays(new Date(), 1).toISOString(),
              updated_at: completedAt
            })
            .eq('id', target.id)
        }
      }
    } finally {
      await browser.close().catch(() => undefined)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processed, failed, skipped })
    }
  } catch (error: any) {
    console.error('Monitoring cron error:', error?.message || error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Monitoring cron zlyhal.' })
    }
  }
}
