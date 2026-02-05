import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

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

    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (adminError || adminProfile?.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Pristup zamietnuty.' }) }
    }

    const auditId = event.queryStringParameters?.id
    if (!auditId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Chyba audit ID.' }) }
    }

    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('id, user_id, url, audit_kind, summary, created_at')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Audit neexistuje.' }) }
    }

    const { data: fullData, error: fullError } = await supabase
      .from('audit_full')
      .select('full_issues')
      .eq('audit_id', auditId)
      .single()

    if (fullError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie detailu zlyhalo.' }) }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, consent_marketing, plan')
      .eq('id', audit.user_id)
      .single()

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audit: {
          id: audit.id,
          url: audit.url,
          auditKind: audit.audit_kind,
          createdAt: audit.created_at,
          summary: audit.summary,
          profile: {
            email: profile?.email || null,
            consentMarketing: !!profile?.consent_marketing,
            plan: profile?.plan || 'free'
          },
          fullIssues: Array.isArray(fullData?.full_issues) ? fullData.full_issues : []
        }
      })
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Server error.' })
    }
  }
}
