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

    const { data: audits, error: auditError } = await supabase
      .from('audits')
      .select('id, user_id, url, audit_kind, summary, top_issues, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (auditError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie auditov zlyhalo.' }) }
    }

    const userIds = Array.from(new Set((audits || []).map((a) => a.user_id)))
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, consent_marketing, plan')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

    if (profileError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie profilov zlyhalo.' }) }
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    const payload = (audits || []).map((audit) => {
      const profile = profileMap.get(audit.user_id)
      const topIssues = Array.isArray(audit.top_issues) ? audit.top_issues : []
      return {
        id: audit.id,
        userId: audit.user_id,
        url: audit.url,
        auditKind: audit.audit_kind,
        createdAt: audit.created_at,
        summary: audit.summary,
        topIssuesCount: topIssues.length,
        profile: {
          email: profile?.email || null,
          consentMarketing: !!profile?.consent_marketing,
          plan: profile?.plan || 'free'
        }
      }
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audits: payload })
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Server error.' })
    }
  }
}
