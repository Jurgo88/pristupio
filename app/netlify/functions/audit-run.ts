import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // Dynamické importy pre kompatibilitu
  const chromium = require('@sparticuz/chromium-min');
  const { chromium: playwright } = require('playwright-core');
  const axe = require('axe-core');

  try {
    const { url } = JSON.parse(event.body || '{}');
    if (!url) return { statusCode: 400, body: JSON.stringify({ error: 'Missing URL' }) };

    // Konfigurácia pre Netlify vs Localhost
    const isLocal = process.env.NETLIFY_DEV === 'true' || !process.env.LAMBDA_TASK_ROOT;
    
    const browser = await playwright.launch({
      args: isLocal ? [] : chromium.args,
      executablePath: isLocal ? undefined : await chromium.executablePath(),
      headless: isLocal ? true : chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Audit
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run();
    });

    await browser.close();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ violations: results.violations }),
    };
  } catch (error: any) {
    console.error('Audit failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};