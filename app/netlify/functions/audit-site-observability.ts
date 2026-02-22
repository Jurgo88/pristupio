export type AuditErrorCategory = 'network' | 'parsing' | 'audit' | 'timeout' | 'security' | 'unknown'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  return String(error || 'Unknown error')
}

export const truncateText = (value: unknown, limit: number) => {
  const text = typeof value === 'string' ? value : ''
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}...`
}

export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const classifyAuditError = (error: unknown): AuditErrorCategory => {
  const text = getErrorMessage(error).toLowerCase()
  if (text.includes('[audit]')) return 'audit'
  if (text.includes('timeout') || text.includes('timed out')) return 'timeout'
  if (
    text.includes('econnreset') ||
    text.includes('enotfound') ||
    text.includes('eai_again') ||
    text.includes('http') ||
    text.includes('navigation')
  ) {
    return 'network'
  }
  if (text.includes('axe') || text.includes('violation') || text.includes('wcag')) return 'audit'
  if (text.includes('parse') || text.includes('json') || text.includes('malformed')) return 'parsing'
  if (text.includes('ssrf') || text.includes('private network') || text.includes('unsafe target')) return 'security'
  return 'unknown'
}

export const formatCategorizedError = (error: unknown) => {
  const category = classifyAuditError(error)
  const message = getErrorMessage(error)
  if (message.trim().startsWith('[')) {
    return {
      category,
      message
    }
  }
  return {
    category,
    message: `[${category}] ${message}`
  }
}

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

const parseLogLevel = (value: unknown): LogLevel => {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') return value
  return 'info'
}

const getMinLogLevel = () => parseLogLevel(process.env.AUDIT_SITE_LOG_LEVEL)

export const logJson = (level: LogLevel, event: string, fields?: Record<string, unknown>) => {
  const minLevel = getMinLogLevel()
  if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[minLevel]) return

  const payload = {
    ts: new Date().toISOString(),
    level,
    domain: 'audit-site',
    event,
    ...(fields || {})
  }

  const line = JSON.stringify(payload)
  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.log(line)
}

