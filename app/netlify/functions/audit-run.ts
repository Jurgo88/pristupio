import { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  // Dynamické načítanie modulov až pri spustení funkcie
  // Toto rieši chybu "Cannot find module ../../../package.json"
  const { chromium } = require('playwright-core')
  const axe = require('axe-core')

  try {
    const { url } = JSON.parse(event.body || '{}')

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing url' }),
      }
    }

    // Spustenie Chromium (Optimalizované pre serverless/Windows)
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    })

    const page = await browser.newPage()
    
    // Načítanie stránky
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // Injektovanie axe-core zdroja priamo do stránky
    await page.addScriptTag({ content: axe.source })

    // Spustenie samotného auditu v kontexte prehliadača
    const results = await page.evaluate(async () => {
      // @ts-ignore (axe je teraz dostupný v okne prehliadača)
      return await window.axe.run()
    })

    await browser.close()

    // Mapovanie výsledkov
    const violations = results.violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      nodes: v.nodes.length,
    }))

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, violations }),
    }
  } catch (error: any) {
    console.error('Audit Error:', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}