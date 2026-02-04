import { Handler } from '@netlify/functions';
import chromium from '@sparticuz/chromium-min';
import { chromium as playwright } from 'playwright-core';
import axe from 'axe-core';

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';

export const handler: Handler = async (event) => {
  console.log("Log: Audit starting...");
  
  try {
    const body = JSON.parse(event.body || '{}');
    let url = body.url;

    // Validácia vstupu
    //ak je url bez http alebo https tak to tam doplníme

    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }

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
    page.setDefaultNavigationTimeout(45000);

    // Znížime náročnosť stránky (menej pamäte) – blokujeme médiá, fonty, obrázky
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'media' || type === 'font') {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Vloženie a spustenie axe s WCAG 2.1 AA tagmi (max. automatizovateľný rozsah)
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        },
        resultTypes: ['violations', 'incomplete', 'passes', 'inapplicable']
      });
    });

    await browser.close();
    console.log("Log: Audit úspešne dokončený.");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        results,
        meta: {
          standard: 'EN 301 549 (WCAG 2.1 AA)',
          tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
          note: 'Automatizované testy nepokrývajú všetky kritériá; časť vyžaduje manuálnu kontrolu.'
        }
      }),
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
