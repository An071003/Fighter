// Captures showroom / exploded / cutaway / close-up shots at 1440x900 for visual review.
// Usage: node scripts/capture-look.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'proof/look';

const browser = await chromium.launch({
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(baseUrl);
await page.waitForFunction(() => window.__AERIS_DEBUG__?.getState().assetReady === true, null, {
  timeout: 60000,
});
const dispatch = (event) => page.evaluate((e) => window.__AERIS_DEBUG__.getState().dispatch(e), event);
const shot = async (name, wait = 4500) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('captured', name);
};

await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'hero' });
await shot('look-showroom');
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 1 });
await shot('look-exploded', 6000);
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'side' });
await shot('look-exploded-side', 5000);
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0 });
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'hero' });
await page.evaluate(() => window.__AERIS_DEBUG__.getState().toggleCutaway());
await shot('look-cutaway', 5000);
await page.evaluate(() => window.__AERIS_DEBUG__.getState().toggleCutaway());
await dispatch({ type: 'STORY_GOTO', index: 2 });
await shot('look-gear-closeup', 5000);
await dispatch({ type: 'STORY_GOTO', index: 0 });
await shot('look-cockpit', 5000);
await browser.close();
