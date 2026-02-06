type LemonCheckoutParams = {
  baseUrl: string
  userId?: string | null
  email?: string | null
}

export const buildLemonCheckoutUrl = ({ baseUrl, userId, email }: LemonCheckoutParams) => {
  if (!baseUrl) return ''

  try {
    const url = new URL(baseUrl)

    if (userId) {
      url.searchParams.set('checkout[custom][user_id]', userId)
    }

    if (email) {
      url.searchParams.set('checkout[email]', email)
    }

    return url.toString()
  } catch (_error) {
    return baseUrl
  }
}
