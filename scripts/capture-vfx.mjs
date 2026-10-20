// Captures gear / airframe-detail / exhaust / airflow shots at 1440x900 for visual review.
// Usage: node scripts/capture-vfx.mjs [baseUrl] [outDir]
import { chromium } from '@playwright/test';

const baseUrl = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ?? 'proof/vfx';

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

await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'side' });
await shot('vfx-gear-side');
await dispatch({ type: 'SELECT_PART', partId: 'gear-strut-left' });
await shot('vfx-gear-closeup');
await dispatch({ type: 'DESELECT_PART' });
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'hero' });
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 1 });
await shot('vfx-exploded', 6000);
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'detail' });
await shot('vfx-fuselage-detail', 5000);
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'front' });
await shot('vfx-nose-detail', 5000);
await dispatch({ type: 'SET_CAMERA_PRESET', preset: 'hero' });
await dispatch({ type: 'SET_EXPLODE_PROGRESS', value: 0 });
await page.waitForTimeout(3000);
// Take-off: plays 0 -> 3.0s then holds (slow in software WebGL, so wait for the hold)
await dispatch({ type: 'STORY_GOTO', index: 4 });
await page.waitForFunction(() => window.__AERIS_DEBUG__.getVisualClock().flightTimeSeconds >= 2.94, null, {
  timeout: 90000,
});
await shot('vfx-exhaust-takeoff', 3000);
await dispatch({ type: 'STORY_GOTO', index: 6 });
await shot('vfx-airflow-cruise', 6000);
await browser.close();
