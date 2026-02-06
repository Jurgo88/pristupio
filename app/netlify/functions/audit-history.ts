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

    const { data: audits, error: auditError } = await supabase
      .from('audits')
      .select('id, url, audit_kind, summary, top_issues, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (auditError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Nacitanie auditov zlyhalo.' }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audits: audits || [] })
    }
  } catch (error: any) {
    console.error('Audit history error:', error?.message || error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Audity sa nepodarilo nacitat.' }) }
  }
}
