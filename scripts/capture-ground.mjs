// Captures cockpit seat, engine-start spool-up and taxi roll for visual review.
// Usage: node scripts/capture-ground.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'proof/ground';

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

// Cockpit: canopy lifted in the exploded view
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0.55 });
await dispatch({ type: 'SELECT_PART', partId: 'display-plate' });
await shot('ground-cockpit', 6000);
await dispatch({ type: 'DESELECT_PART' });
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0 });
await page.waitForTimeout(2500);

// Gate (engine off) -> engine start spool-up
await dispatch({ type: 'STORY_GOTO', index: 0 });
await shot('ground-gate', 4000);
await dispatch({ type: 'STORY_GOTO', index: 1 });
await shot('ground-start-early', 1200);
await shot('ground-start-spooled', 6000);

// Taxi: markings scroll + wheels roll
await dispatch({ type: 'STORY_GOTO', index: 2 });
await shot('ground-taxi-a', 4000);
const offA = await page.evaluate(() => performance.now());
await shot('ground-taxi-b', 1500);
console.log('taxi frames ms apart', Math.round((await page.evaluate(() => performance.now())) - offA));
await dispatch({ type: 'STORY_GOTO', index: 3 });
await shot('ground-lineup', 4500);
await browser.close();
