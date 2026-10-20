// Captures the airframe silhouette from hero / front / top / side / exploded + take-off plume.
// Usage: node scripts/capture-shape.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'proof/shape';

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

for (const preset of ['hero', 'front', 'top', 'side']) {
  await dispatch({ type: 'SET_CAMERA_PRESET', preset });
  await shot(`shape-${preset}`);
}
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'hero' });
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 1 });
await shot('shape-exploded', 6000);
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0 });
await page.waitForTimeout(3000);
await dispatch({ type: 'STORY_GOTO', index: 4 });
await page.waitForFunction(() => window.__AERIS_DEBUG__.getVisualClock().flightTimeSeconds >= 2.94, null, {
  timeout: 90000,
});
await shot('shape-takeoff', 3000);
await browser.close();
