import type { Summary } from './monitoring-core'

declare const process: {
  env: Record<string, string | undefined>
}

type DiffShape = {
  totalDelta: number
  byImpactDelta: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
  newIssues: number
  resolvedIssues: number
}

type MonitoringEmailInput = {
  to: string
  runUrl: string
  trigger: 'manual' | 'scheduled'
  diff: unknown
  summary: Summary
}

const toNumber = (value: unknown) => {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export const normalizeDiff = (raw: unknown): DiffShape => {
  const byImpact = ((raw as any)?.byImpactDelta || {}) as Record<string, unknown>
  return {
    totalDelta: toNumber((raw as any)?.totalDelta),
    byImpactDelta: {
      critical: toNumber(byImpact.critical),
      serious: toNumber(byImpact.serious),
      moderate: toNumber(byImpact.moderate),
      minor: toNumber(byImpact.minor)
    },
    newIssues: Math.max(0, toNumber((raw as any)?.newIssues)),
    resolvedIssues: Math.max(0, toNumber((raw as any)?.resolvedIssues))
  }
}

export const isWorseningDiff = (raw: unknown) => {
  const diff = normalizeDiff(raw)
  return diff.totalDelta > 0 || diff.byImpactDelta.critical > 0 || diff.byImpactDelta.serious > 0
}

const signed = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

const htmlEscape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const sendMonitoringWorseningEmail = async (input: MonitoringEmailInput) => {
  const enabled = String(process.env.MONITORING_EMAIL_NOTIFICATIONS || '').toLowerCase() === 'true'
  if (!enabled) return { sent: false, reason: 'disabled' as const }

  const apiKey = process.env.RESEND_API_KEY || ''
  const from = process.env.MONITORING_EMAIL_FROM || ''
  if (!apiKey || !from) {
    return { sent: false, reason: 'missing-config' as const }
  }

  const to = (input.to || '').trim()
  if (!to) {
    return { sent: false, reason: 'missing-recipient' as const }
  }

  const diff = normalizeDiff(input.diff)
  if (!isWorseningDiff(diff)) {
    return { sent: false, reason: 'no-worsening' as const }
  }

  const dashboardBase = process.env.APP_BASE_URL || process.env.URL || ''
  const dashboardLink = dashboardBase ? `${dashboardBase.replace(/\/+$/, '')}/dashboard` : ''
  const safeUrl = htmlEscape(input.runUrl)
  const safeDashboard = htmlEscape(dashboardLink)

  const subject = `Pristupio monitoring: zhoršenie na ${input.runUrl}`
  const html = `
    <h2>Monitoring upozornenie: zhoršenie stavu</h2>
    <p><strong>Doména:</strong> ${safeUrl}</p>
    <p><strong>Typ behu:</strong> ${input.trigger === 'scheduled' ? 'Plánovaný monitoring' : 'Manuálny monitoring'}</p>
    <h3>Report zmeny oproti minulému auditu</h3>
    <ul>
      <li><strong>Zmena spolu:</strong> ${signed(diff.totalDelta)}</li>
      <li><strong>Nové problémy:</strong> +${diff.newIssues}</li>
      <li><strong>Vyriešené problémy:</strong> -${diff.resolvedIssues}</li>
      <li><strong>Kritické:</strong> ${signed(diff.byImpactDelta.critical)}</li>
      <li><strong>Seriózne:</strong> ${signed(diff.byImpactDelta.serious)}</li>
      <li><strong>Moderátne:</strong> ${signed(diff.byImpactDelta.moderate)}</li>
      <li><strong>Minor:</strong> ${signed(diff.byImpactDelta.minor)}</li>
    </ul>
    <h3>Posledný audit (sumár)</h3>
    <ul>
      <li><strong>Spolu:</strong> ${toNumber(input.summary?.total)}</li>
      <li><strong>Kritické:</strong> ${toNumber(input.summary?.byImpact?.critical)}</li>
      <li><strong>Seriózne:</strong> ${toNumber(input.summary?.byImpact?.serious)}</li>
      <li><strong>Moderátne:</strong> ${toNumber(input.summary?.byImpact?.moderate)}</li>
      <li><strong>Minor:</strong> ${toNumber(input.summary?.byImpact?.minor)}</li>
    </ul>
    ${dashboardLink ? `<p><a href="${safeDashboard}">Otvoriť dashboard</a></p>` : ''}
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('Monitoring email send failed:', response.status, body)
    return { sent: false, reason: 'provider-error' as const }
  }

  return { sent: true, reason: 'sent' as const }
}

