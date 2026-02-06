import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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

    const auditId = event.queryStringParameters?.id
    if (!auditId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Chyba audit ID.' }) }
    }

    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('id, url, audit_kind, summary, top_issues, created_at, user_id')
      .eq('id', auditId)
      .single()

    if (auditError || !audit || audit.user_id !== userData.user.id) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Audit neexistuje.' }) }
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

    const report = {
      summary: audit.summary || emptySummary(),
      issues
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
          note: 'Automatizovane testy nepokrivaju vsetky kriteria; cast vyzaduje manualnu kontrolu.'
        }
      })
    }
  } catch (error: any) {
    console.error('Audit detail error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Audit sa nepodarilo nacitat.' }) }
  }
}
