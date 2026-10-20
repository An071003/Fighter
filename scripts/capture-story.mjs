// Captures each guided story phase at 1440x900 for visual review. Usage: node scripts/capture-story.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'proof/story';
const phases = ['gate', 'start', 'taxi', 'lineup', 'takeoff', 'climb', 'cruise'];

const browser = await chromium.launch({
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(baseUrl);
await page.waitForFunction(() => window.__AERIS_DEBUG__?.getState().assetReady === true, null, {
  timeout: 60000,
});
await page.waitForTimeout(1500);

for (let i = 0; i < phases.length; i++) {
  await page.keyboard.press(String(i + 1));
  // Take-off & climb segments play their flight timeline before the hold.
  await page.waitForTimeout(i === 4 || i === 5 ? 7000 : 5000);
  await page.screenshot({ path: `${outDir}/story-${i + 1}-${phases[i]}.png` });
  console.log('captured', phases[i]);
}
await browser.close();
