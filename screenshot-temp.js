const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  const out = 'C:\\\\Users\\\\Renas Talabani\\\\AppData\\\\Local\\\\Temp\\\\claude\\\\c--Users-Renas-Talabani-Documents-Reno-System-Ai\\\\1b8d1ae8-e552-43a8-9ac5-08b6ead025eb\\\\scratchpad';

  const pages = [
    ['search', 'http://127.0.0.1:3000/workspace/search'],
    ['setup', 'http://127.0.0.1:3000/setup'],
    ['ai-agents', 'http://127.0.0.1:3000/ai-agents'],
    ['workspace-memory', 'http://127.0.0.1:3000/workspace/memory'],
    ['commands', 'http://127.0.0.1:3000/workspace/commands'],
    ['ai-work', 'http://127.0.0.1:3000/ai-work'],
  ];

  for (const [name, url] of pages) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: out + '\\\\' + name + '.png' });
      console.log(name + ' done');
    } catch(e) { console.error(name + ' failed: ' + e.message.slice(0, 60)); }
  }

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
