#!/usr/bin/env node

import process from 'node:process'

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])
const EXPECTED_STATUSES = new Set(['completed', 'failed', 'cancelled'])

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseArgs = (argv) => {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token || !token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      args[key] = 'true'
      continue
    }

    args[key] = next
    index += 1
  }
  return args
}

const parseNumberArg = (value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

const safeJson = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`Invalid --base-url: ${trimmed}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported --base-url protocol: ${parsed.protocol}`)
  }
  return parsed.toString().replace(/\/+$/, '')
}

const normalizeTargetUrl = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`Invalid --root-url: ${trimmed}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported --root-url protocol: ${parsed.protocol}`)
  }
  return parsed.toString()
}

const printUsage = () => {
  console.log(`
Usage:
  node scripts/site-audit-smoke.mjs --base-url <url> --token <jwt> --root-url <url> [options]

Required:
  --base-url           App origin, e.g. https://pristupio.netlify.app
  --token              Supabase access token (Bearer)
  --root-url           URL to audit

Options:
  --mode               full | quick (default: full)
  --lang               sk | en (default: sk)
  --pages-limit        integer (optional)
  --max-depth          integer (optional)
  --poll-ms            status poll interval in ms (default: 2500)
  --timeout-ms         overall timeout in ms (default: 1200000)
  --cancel-after-ms    cancel audit after elapsed ms (optional)
  --expect-status      completed | failed | cancelled (default: completed)
  --allow-existing     true | false (default: true)

Environment fallbacks:
  SITE_AUDIT_BASE_URL
  SITE_AUDIT_BEARER_TOKEN
  SITE_AUDIT_ROOT_URL
`)
}

const formatPayload = (payload) => {
  if (!payload) return 'null'
  try {
    return JSON.stringify(payload)
  } catch {
    return String(payload)
  }
}

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  return fallback
}

const requestJson = async ({ baseUrl, path, method, token, body }) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const payload = await safeJson(response)
  return { response, payload }
}

const resolveJobIdFromStart = (startStatus, payload, allowExisting) => {
  if (startStatus === 202 && payload?.jobId) return String(payload.jobId)
  if (startStatus === 409 && allowExisting && payload?.job?.id) return String(payload.job.id)
  return ''
}

const extractJobFromStatusPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  const job = payload.job
  if (!job || typeof job !== 'object') return null
  if (!job.id) return null
  return job
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (toBool(args.help, false)) {
    printUsage()
    return
  }

  const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.SITE_AUDIT_BASE_URL)
  const token = String(args.token || process.env.SITE_AUDIT_BEARER_TOKEN || '').trim()
  const rootUrl = normalizeTargetUrl(args['root-url'] || process.env.SITE_AUDIT_ROOT_URL)
  const mode = String(args.mode || 'full').trim().toLowerCase() === 'quick' ? 'quick' : 'full'
  const lang = String(args.lang || 'sk').trim().toLowerCase() === 'en' ? 'en' : 'sk'
  const pollMs = parseNumberArg(args['poll-ms'], 2_500, 500, 60_000)
  const timeoutMs = parseNumberArg(args['timeout-ms'], 20 * 60 * 1_000, 5_000, 6 * 60 * 60 * 1_000)
  const cancelAfterMsRaw = args['cancel-after-ms']
  const cancelAfterMs =
    cancelAfterMsRaw === undefined ? null : parseNumberArg(cancelAfterMsRaw, 5_000, 0, 6 * 60 * 60 * 1_000)
  const expectStatus = String(args['expect-status'] || 'completed').trim().toLowerCase()
  const allowExisting = toBool(args['allow-existing'], true)

  if (!baseUrl || !token || !rootUrl) {
    printUsage()
    throw new Error('Missing required arguments: --base-url, --token, --root-url')
  }
  if (!EXPECTED_STATUSES.has(expectStatus)) {
    throw new Error(`Invalid --expect-status: ${expectStatus}`)
  }

  const pagesLimit = args['pages-limit'] === undefined ? undefined : parseNumberArg(args['pages-limit'], 50, 1, 5_000)
  const maxDepth = args['max-depth'] === undefined ? undefined : parseNumberArg(args['max-depth'], 4, 0, 20)

  const startBody = {
    rootUrl,
    mode,
    lang,
    pagesLimit,
    maxDepth
  }

  const startedAt = Date.now()
  console.log(`[smoke] starting site audit: ${rootUrl}`)
  const startResult = await requestJson({
    baseUrl,
    path: '/.netlify/functions/audit-site-start',
    method: 'POST',
    token,
    body: startBody
  })

  const jobId = resolveJobIdFromStart(startResult.response.status, startResult.payload, allowExisting)
  if (!jobId) {
    throw new Error(
      `Start failed with status ${startResult.response.status}. Payload: ${formatPayload(startResult.payload)}`
    )
  }

  console.log(
    `[smoke] jobId=${jobId} startStatus=${startResult.response.status} workerDispatched=${String(
      startResult.payload?.workerDispatched
    )}`
  )

  let cancelRequested = false
  let finalJob = null
  let lastPrinted = ''

  while (Date.now() - startedAt < timeoutMs) {
    if (!cancelRequested && cancelAfterMs !== null && Date.now() - startedAt >= cancelAfterMs) {
      const cancelResult = await requestJson({
        baseUrl,
        path: '/.netlify/functions/audit-site-cancel',
        method: 'POST',
        token,
        body: { jobId }
      })
      cancelRequested = true
      console.log(
        `[smoke] cancel requested status=${cancelResult.response.status} payload=${formatPayload(cancelResult.payload)}`
      )
    }

    const statusResult = await requestJson({
      baseUrl,
      path: `/.netlify/functions/audit-site-status?jobId=${encodeURIComponent(jobId)}`,
      method: 'GET',
      token
    })

    if (!statusResult.response.ok) {
      throw new Error(
        `Status failed with ${statusResult.response.status}. Payload: ${formatPayload(statusResult.payload)}`
      )
    }

    const job = extractJobFromStatusPayload(statusResult.payload)
    if (!job) {
      throw new Error(`Status payload missing job object: ${formatPayload(statusResult.payload)}`)
    }

    const progress = Number(job.progress || 0)
    const printLine = `${job.status}|${job.pagesScanned}|${job.pagesFailed}|${job.pagesQueued}|${progress}`
    if (printLine !== lastPrinted) {
      lastPrinted = printLine
      console.log(
        `[smoke] status=${job.status} progress=${progress}% scanned=${job.pagesScanned} failed=${job.pagesFailed} queued=${job.pagesQueued}`
      )
    }

    if (TERMINAL_STATUSES.has(String(job.status || ''))) {
      finalJob = job
      break
    }

    await delay(pollMs)
  }

  if (!finalJob) {
    throw new Error(`Timed out after ${timeoutMs} ms waiting for terminal status.`)
  }

  const finalStatus = String(finalJob.status || '')
  if (finalStatus !== expectStatus) {
    throw new Error(
      `Unexpected final status. expected=${expectStatus} actual=${finalStatus} error=${String(finalJob.error || '')}`
    )
  }

  if (finalStatus === 'completed') {
    const resultPayload = await requestJson({
      baseUrl,
      path: `/.netlify/functions/audit-site-result?jobId=${encodeURIComponent(jobId)}&lang=${encodeURIComponent(lang)}`,
      method: 'GET',
      token
    })

    if (!resultPayload.response.ok) {
      throw new Error(
        `Result failed with ${resultPayload.response.status}. Payload: ${formatPayload(resultPayload.payload)}`
      )
    }

    const audit = resultPayload.payload?.audit
    const totalIssues = Number(audit?.report?.summary?.total || 0)
    console.log(
      `[smoke] completed auditId=${String(audit?.auditId || '')} pagesScanned=${Number(
        audit?.pagesScanned || 0
      )} totalIssues=${totalIssues}`
    )
  } else {
    console.log(`[smoke] terminal status=${finalStatus} error=${String(finalJob.error || '')}`)
  }

  console.log('[smoke] OK')
}

main().catch((error) => {
  console.error(`[smoke] ERROR: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
