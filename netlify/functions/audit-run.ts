import { Handler } from '@netlify/functions'
import { chromium } from 'playwright-core'
import axe from 'axe-core'

export const handler: Handler = async (event) => {
  try {
    const { url } = JSON.parse(event.body || '{}')

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing url' }),
      }
    }

    // Launch Chromium headless (Windows safe)
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // Inject axe-core
    await page.addScriptTag({ content: axe.source })

    // Run accessibility audit
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await axe.run()
    })

    await browser.close()

    // Map violations to simplified object
    const violations = results.violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      nodes: v.nodes.length,
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ url, violations }),
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
