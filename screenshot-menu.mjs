import { createRequire } from 'module';
const puppeteer = createRequire(import.meta.url)(
  'C:/Users/zamar/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js'
);
import fs from 'fs';
import path from 'path';

const dir = './temporary screenshots';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
let next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/zamar/.cache/puppeteer/chrome/win64-146.0.7680.66/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function shot(page, label) {
  const filepath = path.join(dir, `screenshot-${next++}-${label}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`Saved: ${filepath}`);
}

// Test 1: 375px menu open
{
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Toggle theme"]');
  // Click the hamburger menu button
  const buttons = await page.$$('header button');
  // The hamburger is the last button in the header on mobile
  for (const btn of buttons) {
    const box = await btn.boundingBox();
    if (box && box.x > 300) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 400));
  await shot(page, '375-menu-open');
  await page.close();
}

// Test 2: 320px menu open
{
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 568, isMobile: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('button[aria-label="Toggle theme"]');
  const buttons = await page.$$('header button');
  for (const btn of buttons) {
    const box = await btn.boundingBox();
    if (box && box.x > 260) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 400));
  await shot(page, '320-menu-open');
  await page.close();
}

// Test 3: 375px scrolled to comparison table
{
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => document.querySelector('#comparison')?.scrollIntoView());
  await new Promise(r => setTimeout(r, 500));
  await shot(page, '375-comparison-table');
  await page.close();
}

await browser.close();
