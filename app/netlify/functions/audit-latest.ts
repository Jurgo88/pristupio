import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_ISSUE_LOCALE, localizeIssues, normalizeIssueLocale } from './audit-copy'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

const emptySummary = () => ({
  total: 0,
  byImpact: {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  }
})

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

    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('id, url, audit_kind, summary, top_issues, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (auditError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie auditu zlyhalo.' }) }
    }

    if (!audit) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: null })
      }
    }

    let issues: any[] = Array.isArray(audit.top_issues) ? audit.top_issues : []
    if (audit.audit_kind === 'paid') {
      const { data: fullData } = await supabase
        .from('audit_full')
        .select('full_issues')
        .eq('audit_id', audit.id)
        .single()
      if (Array.isArray(fullData?.full_issues)) {
        issues = fullData.full_issues
      }
    }
    const locale = normalizeIssueLocale(event.queryStringParameters?.lang, DEFAULT_ISSUE_LOCALE)

    const report = {
      summary: audit.summary || emptySummary(),
      issues: localizeIssues(issues, locale, DEFAULT_ISSUE_LOCALE)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auditId: audit.id,
        url: audit.url,
        auditKind: audit.audit_kind,
        accessLevel: audit.audit_kind === 'paid' ? 'paid' : 'free',
        report,
        meta: {
          standard: 'EN 301 549 (WCAG 2.1 AA)',
          tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
          note: 'Automatizovane testy nepokrivaju vsetky kriteria; cast vyzaduje manualnu kontrolu.',
          locale
        }
      })
    }
  } catch (error: any) {
    console.error('Audit latest error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Audit sa nepodarilo nacitat.' }) }
  }
}
