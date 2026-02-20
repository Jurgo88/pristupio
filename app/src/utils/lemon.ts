type LemonCheckoutParams = {
  baseUrl: string
  userId?: string | null
  email?: string | null
  customData?: Record<string, string | number | boolean | null | undefined>
}

export const buildLemonCheckoutUrl = ({
  baseUrl,
  userId,
  email,
  customData
}: LemonCheckoutParams) => {
  if (!baseUrl) return ''

  try {
    const url = new URL(baseUrl)

    if (userId) {
      url.searchParams.set('checkout[custom][user_id]', userId)
    }

    if (email) {
      url.searchParams.set('checkout[email]', email)
    }

    if (customData) {
      Object.entries(customData).forEach(([key, value]) => {
        if (value === null || typeof value === 'undefined') return
        url.searchParams.set(`checkout[custom][${key}]`, String(value))
      })
    }

    return url.toString()
  } catch (_error) {
    return baseUrl
  }
}
