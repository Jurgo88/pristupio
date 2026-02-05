import { Handler } from '@netlify/functions'
import chromium from '@sparticuz/chromium-min'
import { chromium as playwright } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

type Impact = 'critical' | 'serious' | 'moderate' | 'minor'

type ReportIssue = {
  id?: string
  title?: string
  impact?: Impact
  description?: string
  recommendation?: string
  wcag?: string
  wcagLevel?: string
  principle?: string
  helpUrl?: string
  nodesCount?: number
}

type ReportPayload = {
  summary?: {
    total?: number
    byImpact?: Record<Impact, number>
  }
  issues?: ReportIssue[]
}

type ExportPayload = {
  url?: string
  profile?: string
  profileLabel?: string
  filters?: {
    principle?: string | null
    impact?: string | null
    search?: string | null
  }
  report?: ReportPayload
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const safeText = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) return fallback
  return escapeHtml(String(value))
}

const normalizeImpact = (value?: string): Impact => {
  if (value === 'critical' || value === 'serious' || value === 'moderate' || value === 'minor') {
    return value
  }
  return 'minor'
}

const buildSummary = (issues: ReportIssue[]) => {
  const summary = {
    total: issues.length,
    byImpact: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    }
  }

  issues.forEach((issue) => {
    const impact = normalizeImpact(issue.impact)
    summary.byImpact[impact] += 1
  })

  return summary
}

const computeScore = (summary: { total: number; byImpact: Record<Impact, number> }) => {
  if (summary.total === 0) return 100
  const penalty =
    summary.byImpact.critical * 18 +
    summary.byImpact.serious * 10 +
    summary.byImpact.moderate * 5 +
    summary.byImpact.minor * 2
  const score = 100 / (1 + penalty / 60)
  return Math.max(0, Math.round(score))
}

const percent = (count: number, total: number) => {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

const formatDate = (iso?: string) => {
  if (iso) return iso.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

const buildFiltersLine = (filters?: ExportPayload['filters']) => {
  if (!filters) return 'Filters: none'
  const entries: string[] = []
  if (filters.principle) entries.push(`Principle: ${safeText(filters.principle)}`)
  if (filters.impact) entries.push(`Impact: ${safeText(filters.impact)}`)
  if (filters.search) entries.push(`Search: ${safeText(filters.search)}`)
  return entries.length ? entries.join(' | ') : 'Filters: none'
}

const buildIssuesHtml = (issues: ReportIssue[]) => {
  if (!issues.length) {
    return `<div class="empty">No accessibility issues were found.</div>`
  }

  return issues
    .map((issue) => {
      const impact = normalizeImpact(issue.impact)
      return `
        <div class="issue">
          <div class="issue-head">
            <span class="pill pill-${impact}">${impact.toUpperCase()}</span>
            <div class="issue-title">${safeText(issue.title || 'Issue')}</div>
          </div>
          <div class="issue-meta">
            <span><strong>WCAG:</strong> ${safeText(issue.wcag || 'N/A')}</span>
            <span><strong>Level:</strong> ${safeText(issue.wcagLevel || 'N/A')}</span>
            <span><strong>Principle:</strong> ${safeText(issue.principle || 'N/A')}</span>
          </div>
          <div class="issue-desc">${safeText(issue.description || '')}</div>
          <div class="issue-rec"><strong>Recommendation:</strong> ${safeText(
            issue.recommendation || ''
          )}</div>
          <div class="issue-count">Affected elements: ${Number(issue.nodesCount || 0)}</div>
          ${
            issue.helpUrl
              ? `<div class="issue-link">Guidance: ${safeText(issue.helpUrl)}</div>`
              : ''
          }
        </div>
      `
    })
    .join('')
}

export const handler: Handler = async (event) => {
  try {
    if (!supabase) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Supabase config missing.' }) }
    }

    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Chyba autorizacia.' }) }
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Neplatne prihlasenie.' }) }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile || (profile.plan !== 'paid' && profile.role !== 'admin')) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Export je dostupny len pre plateny audit.' }) }
    }

    const body = JSON.parse(event.body || '{}') as ExportPayload
    const report = body.report
    const issues = Array.isArray(report?.issues) ? report!.issues! : []
    const summary = report?.summary?.byImpact ? report!.summary! : buildSummary(issues)

    if (!issues.length && (!summary.total || summary.total === 0)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Report data is missing.' })
      }
    }

    const normalizedSummary = {
      total: summary.total ?? issues.length,
      byImpact: {
        critical: summary.byImpact?.critical || 0,
        serious: summary.byImpact?.serious || 0,
        moderate: summary.byImpact?.moderate || 0,
        minor: summary.byImpact?.minor || 0
      }
    }

    const highCount = normalizedSummary.byImpact.critical + normalizedSummary.byImpact.serious
    const score = computeScore(normalizedSummary)
    const total = normalizedSummary.total
    const filtersLine = buildFiltersLine(body.filters)
    const issuesHtml = buildIssuesHtml(issues)
    const urlText = body.url ? safeText(body.url) : 'N/A'
    const profileText = safeText(body.profileLabel || body.profile || 'WCAG profile')
    const generatedAt = formatDate()

    const html = `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>WCAG audit report</title>
          <style>
            :root {
              --text: #0f172a;
              --muted: #64748b;
              --border: #e2e8f0;
              --surface: #ffffff;
              --surface-2: #f1f5f9;
              --brand: #1d4ed8;
              --danger: #b91c1c;
              --warning: #b45309;
              --info: #0284c7;
              --radius: 10px;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: "Manrope", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
              color: var(--text);
              background: #ffffff;
            }

            .page {
              display: grid;
              gap: 20px;
            }

            .hero {
              background: linear-gradient(135deg, #0f172a 0%, #111827 100%);
              color: #f8fafc;
              border-radius: 18px;
              padding: 24px 28px;
              display: grid;
              gap: 16px;
            }

            .hero-title {
              font-size: 26px;
              font-weight: 700;
              margin: 0 0 6px;
            }

            .hero-subtitle {
              margin: 0;
              font-size: 13px;
              color: #cbd5f5;
              word-break: break-all;
            }

            .hero-meta {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }

            .meta-card {
              border: 1px solid rgba(148, 163, 184, 0.35);
              border-radius: 12px;
              padding: 10px 12px;
              background: rgba(15, 23, 42, 0.45);
            }

            .meta-card span {
              display: block;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              font-size: 9px;
              color: #94a3b8;
              margin-bottom: 6px;
            }

            .meta-card strong {
              font-size: 12px;
              color: #f8fafc;
            }

            .summary {
              display: grid;
              grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
              gap: 20px;
              align-items: stretch;
            }

            .summary-panel {
              background: var(--surface);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 18px;
              display: grid;
              gap: 12px;
            }

            .score {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 14px;
              align-items: center;
            }

            .score-circle {
              width: 70px;
              height: 70px;
              border-radius: 50%;
              display: grid;
              place-items: center;
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              background: linear-gradient(135deg, #22c55e, #16a34a);
              box-shadow: 0 10px 20px rgba(22, 163, 74, 0.3);
            }

            .score-caption {
              margin: 0;
              color: var(--muted);
              font-size: 12px;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }

            .stat-card {
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 12px;
              background: var(--surface-2);
            }

            .stat-card strong {
              display: block;
              font-size: 18px;
            }

            .stat-card span {
              display: block;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              font-size: 9px;
              color: var(--muted);
            }

            .bars {
              display: grid;
              gap: 10px;
            }

            .bar {
              display: grid;
              gap: 6px;
              font-size: 11px;
              color: var(--muted);
            }

            .bar-track {
              height: 8px;
              background: #e2e8f0;
              border-radius: 999px;
              overflow: hidden;
            }

            .bar-fill {
              height: 100%;
            }

            .bar-fill.critical {
              background: linear-gradient(90deg, #ef4444, #b91c1c);
            }

            .bar-fill.moderate {
              background: linear-gradient(90deg, #f59e0b, #b45309);
            }

            .bar-fill.minor {
              background: linear-gradient(90deg, #38bdf8, #0284c7);
            }

            .filters {
              border: 1px dashed var(--border);
              border-radius: var(--radius);
              padding: 12px 14px;
              font-size: 11px;
              color: var(--muted);
            }

            .issues {
              display: grid;
              gap: 12px;
            }

            .issues h2 {
              margin: 0;
              font-size: 18px;
            }

            .issue {
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 12px 14px;
              display: grid;
              gap: 8px;
              break-inside: avoid;
            }

            .issue-head {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 10px;
              align-items: center;
            }

            .issue-title {
              font-weight: 700;
              font-size: 13px;
            }

            .issue-meta {
              display: flex;
              gap: 14px;
              flex-wrap: wrap;
              font-size: 11px;
              color: var(--muted);
            }

            .issue-desc,
            .issue-rec,
            .issue-count,
            .issue-link {
              font-size: 11px;
              color: var(--text);
            }

            .issue-rec strong {
              color: var(--text);
            }

            .pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 4px 8px;
              border-radius: 999px;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              border: 1px solid transparent;
            }

            .pill-critical {
              background: rgba(239, 68, 68, 0.12);
              color: var(--danger);
              border-color: rgba(239, 68, 68, 0.35);
            }

            .pill-serious {
              background: rgba(194, 65, 12, 0.12);
              color: #9a3412;
              border-color: rgba(194, 65, 12, 0.35);
            }

            .pill-moderate {
              background: rgba(245, 158, 11, 0.12);
              color: var(--warning);
              border-color: rgba(245, 158, 11, 0.35);
            }

            .pill-minor {
              background: rgba(2, 132, 199, 0.12);
              color: var(--info);
              border-color: rgba(2, 132, 199, 0.35);
            }

            .empty {
              padding: 24px;
              text-align: center;
              border: 1px dashed var(--border);
              border-radius: var(--radius);
              color: var(--muted);
            }

            .notes {
              font-size: 10px;
              color: var(--muted);
              border-top: 1px solid var(--border);
              padding-top: 12px;
              display: grid;
              gap: 6px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <header class="hero">
              <div>
                <div class="hero-title">WCAG audit report</div>
                <p class="hero-subtitle">${urlText}</p>
              </div>
              <div class="hero-meta">
                <div class="meta-card">
                  <span>Profile</span>
                  <strong>${profileText}</strong>
                </div>
                <div class="meta-card">
                  <span>Date</span>
                  <strong>${generatedAt}</strong>
                </div>
                <div class="meta-card">
                  <span>Standard</span>
                  <strong>EN 301 549 (WCAG 2.1 AA)</strong>
                </div>
              </div>
            </header>

            <section class="summary">
              <div class="summary-panel">
                <div class="score">
                  <div class="score-circle">${score}</div>
                  <div>
                    <div><strong>Readiness index</strong></div>
                    <p class="score-caption">
                      The score is based on the exported findings and the issue severity mix.
                    </p>
                  </div>
                </div>
                <div class="summary-grid">
                  <div class="stat-card">
                    <span>Critical + Serious</span>
                    <strong>${highCount}</strong>
                  </div>
                  <div class="stat-card">
                    <span>Moderate</span>
                    <strong>${normalizedSummary.byImpact.moderate}</strong>
                  </div>
                  <div class="stat-card">
                    <span>Minor</span>
                    <strong>${normalizedSummary.byImpact.minor}</strong>
                  </div>
                </div>
              </div>
              <div class="summary-panel">
                <div class="bars">
                  <div class="bar">
                    <div>Critical + Serious (${percent(highCount, total)}%)</div>
                    <div class="bar-track">
                      <div class="bar-fill critical" style="width: ${percent(
                        highCount,
                        total
                      )}%"></div>
                    </div>
                  </div>
                  <div class="bar">
                    <div>Moderate (${percent(normalizedSummary.byImpact.moderate, total)}%)</div>
                    <div class="bar-track">
                      <div class="bar-fill moderate" style="width: ${percent(
                        normalizedSummary.byImpact.moderate,
                        total
                      )}%"></div>
                    </div>
                  </div>
                  <div class="bar">
                    <div>Minor (${percent(normalizedSummary.byImpact.minor, total)}%)</div>
                    <div class="bar-track">
                      <div class="bar-fill minor" style="width: ${percent(
                        normalizedSummary.byImpact.minor,
                        total
                      )}%"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="filters">${filtersLine}</section>

            <section class="issues">
              <h2>Identified issues (${total})</h2>
              ${issuesHtml}
            </section>

            <section class="notes">
              <div>Automated checks do not cover all WCAG criteria. Manual review is required.</div>
              <div>Generated with Playwright on Netlify Functions.</div>
            </section>
          </div>
        </body>
      </html>`

    const isLocal = process.env.NETLIFY_DEV === 'true'
    const browser = await playwright.launch({
      args: chromium.args,
      executablePath: isLocal
        ? undefined
        : await chromium.executablePath(
            'https://github.com/sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'
          ),
      headless: chromium.headless
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })

    const headerTemplate = `
      <div style="width:100%; font-size:9px; color:#64748b; padding:0 14mm; font-family: Manrope, Arial, sans-serif;">
        WCAG audit report
      </div>
    `
    const footerTemplate = `
      <div style="width:100%; font-size:9px; color:#64748b; padding:0 14mm; font-family: Manrope, Arial, sans-serif; display:flex; justify-content:space-between;">
        <span>${urlText}</span>
        <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '24mm',
        bottom: '18mm',
        left: '14mm',
        right: '14mm'
      }
    })

    await browser.close()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="wcag-report.pdf"',
        'Cache-Control': 'no-store'
      },
      isBase64Encoded: true,
      body: pdfBuffer.toString('base64')
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'PDF export failed.' })
    }
  }
}
