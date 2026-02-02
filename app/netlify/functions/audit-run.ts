import { Handler } from '@netlify/functions';
// Použijeme klasické importy
import chromium from '@sparticuz/chromium-min';
import { chromium as playwright } from 'playwright-core';
import axe from 'axe-core';

export const handler: Handler = async (event) => {
  console.log("Log: Funkcia audit-run štartuje...");

  try {
    const body = JSON.parse(event.body || '{}');
    const url = body.url;

    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Chýba URL' }) };
    }

    console.log(`Log: Idem auditovať URL: ${url}`);

    // Na Netlify musíme použiť špeciálnu binárku prehliadača
    const isLocal = process.env.NETLIFY_DEV === 'true';
    
    const browser = await playwright.launch({
      args: chromium.args,
      executablePath: isLocal ? undefined : await chromium.executablePath('https://github.com/sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar'),
      headless: chromium.headless,
    });

    console.log("Log: Prehliadač úspešne spustený.");

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Vloženie a spustenie axe
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run();
    });

    await browser.close();
    console.log("Log: Audit úspešne dokončený.");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ violations: results.violations }),
    };

  } catch (error: any) {
    console.error("LOG ERROR:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
    };
  }
};