import { createRequire } from 'module';
const puppeteer = createRequire(import.meta.url)(
  'C:/Users/zamar/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js'
);
import fs from 'fs';
import path from 'path';

const url = process.argv[2] || 'http://localhost:3000';
const width = parseInt(process.argv[3] || '375');
const height = parseInt(process.argv[4] || '812');
const label = process.argv[5] || `w${width}`;

const dir = './temporary screenshots';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
const filepath = path.join(dir, `screenshot-${next}-${label}.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/zamar/.cache/puppeteer/chrome/win64-146.0.7680.66/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width, height, isMobile: width < 768, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await page.screenshot({ path: filepath, fullPage: true });
await browser.close();

console.log(`Saved: ${filepath}`);
