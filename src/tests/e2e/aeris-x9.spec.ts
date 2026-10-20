import { expect, test } from '@playwright/test';

test.describe('AERIS X-9 — End-to-End & Visual Acceptance Suite (Gates G2–G8)', () => {
  test('Desktop 1440x900: Showroom, 46-Part Audit, Inspect, Exploded View, Flight Gear Sequence, Hover Anchor, and Return', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Wait for GLB asset load and Asset Gate audit (A01, A02)
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-asset-ready',
      'true',
      { timeout: 25000 }
    );
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'showroom'
    );

    const audit = await page.evaluate(() => {
      return window.__AERIS_DEBUG__?.getState().assetAudit ?? null;
    });
    expect(audit).not.toBeNull();
    expect(audit?.loaded).toBe(true);
    expect(audit?.totalNamedPartsFound).toBe(46);
    expect(audit?.hasThreeLandingGear).toBe(true);
    expect(audit?.hasGearDoors).toBe(true);
    expect(audit?.isHighFidelity).toBe(true);

    // Wait a moment for studio environment & shadows to settle, then capture Showroom proof
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'proof/showroom.png' });

    // 1b. Cutaway X-Ray Mode verification (Reference Video Fig 1 - cutaway)
    await page.getByTestId('cutaway-toggle').click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'proof/cutaway-xray.png' });
    await page.getByTestId('cutaway-toggle').click();
    await page.waitForTimeout(300);

    // 1c. Verify Front Elevation & Top Plan symmetry and zero distortion
    await page.getByTestId('camera-preset-front').click();
    await page.waitForTimeout(950);
    await page.screenshot({ path: 'proof/view-front.png' });

    await page.getByTestId('camera-preset-top').click();
    await page.waitForTimeout(950);
    await page.screenshot({ path: 'proof/view-top.png' });

    await page.getByTestId('camera-preset-hero').click();
    await page.waitForTimeout(850);

    // 2. Part Selection & Inspector Drawer (B02, B03)
    await page.getByTestId('parts-drawer-toggle').click();
    await expect(page.getByTestId('part-details-drawer')).toBeVisible();
    await page.getByTestId('part-item-wing-right').click();
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'inspect'
    );
    await expect(page.getByTestId('selected-part-card')).toContainText('Cánh phải');
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'proof/inspect-part.png' });

    // Deselect & close drawer via Escape (D03)
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'showroom'
    );
    await page.keyboard.press('Escape');

    // 3. Exploded View 100% & Reassembly (B04, C01)
    await page.getByTestId('explode-toggle').click();
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'exploded'
    );
    await expect(page.getByTestId('explode-slider')).toHaveValue('100');
    await expect(page.getByTestId('flight-start')).toBeDisabled();

    // Wait for smooth explode damping and camera pullback to settle at 100%
    await page.waitForTimeout(1400);
    await page.screenshot({ path: 'proof/exploded.png' });

    // Reassemble to 0%
    await page.getByTestId('explode-toggle').click();
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'showroom'
    );
    await page.waitForTimeout(900);

    // 4. Deterministic Flight Keyframe Verification: t=4.1s Gear Retraction (C03, C04, C05)
    await page.evaluate(() => {
      window.__AERIS_DEBUG__?.getState().dispatch({
        type: 'SEEK_TIMELINE',
        timeSeconds: 4.1,
      });
    });
    await page.waitForTimeout(500);
    const clockAtGear = await page.evaluate(() => {
      return window.__AERIS_DEBUG__?.getVisualClock();
    });
    expect(clockAtGear?.anchorWorldX).toBe(0);
    expect(clockAtGear?.anchorWorldZ).toBe(0);
    await page.screenshot({ path: 'proof/flight-gear.png' });

    // 5. Deterministic Hover Verification: t=7.0s (C05, C06)
    await page.evaluate(() => {
      window.__AERIS_DEBUG__?.getState().dispatch({
        type: 'SEEK_TIMELINE',
        timeSeconds: 7.0,
      });
      window.__AERIS_DEBUG__?.getState().dispatch({
        type: 'RESUME_FLIGHT',
      });
    });
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'hover'
    );
    await page.waitForTimeout(600);
    const clockAtHover = await page.evaluate(() => {
      return window.__AERIS_DEBUG__?.getVisualClock();
    });
    expect(clockAtHover?.anchorWorldX).toBe(0);
    expect(clockAtHover?.anchorWorldZ).toBe(0);
    await page.screenshot({ path: 'proof/hover.png' });

    // 6. Return to Showroom (C07)
    await page.getByTestId('flight-return').click();
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'return-transition'
    );

    // Complete return and verify showroom restored
    await page.evaluate(() => {
      window.__AERIS_DEBUG__?.getState().dispatch({ type: 'COMPLETE_RETURN' });
    });
    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-scene-mode',
      'showroom'
    );

    expect(pageErrors).toEqual([]);
  });

  test('Mobile 390x844 & 360x740: Responsive Layout, Touch Targets >=44px, and No Horizontal Overflow (D02, D06)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByTestId('aeris-app-root')).toHaveAttribute(
      'data-asset-ready',
      'true',
      { timeout: 25000 }
    );
    await page.waitForTimeout(600);

    // Check zero horizontal scroll at 390x844
    const overflow390 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow390).toBe(false);

    // Check primary CTA touch target height >= 44px
    const ctaBox = await page.getByTestId('flight-start').boundingBox();
    expect(ctaBox).not.toBeNull();
    expect(ctaBox!.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({ path: 'proof/mobile.png' });

    // Check 360x740 viewport as well
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(300);
    const overflow360 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow360).toBe(false);
  });
  test('Guided 7-phase story: hotkeys, pinned callouts, take-off hold, climb cutaway, cruise and exit', async ({
    page,
  }) => {
    // Flight segments advance at most 0.05s of sim-time per frame; headless SwiftShader renders the
    // v6 airframe + exhaust/airflow VFX at ~2 fps (measured), so 2.95s of take-off takes ~30s wall time.
    test.setTimeout(300000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const root = page.getByTestId('aeris-app-root');
    await expect(root).toHaveAttribute('data-asset-ready', 'true', { timeout: 25000 });

    // Enter from the transport CTA
    await page.getByTestId('story-start').click();
    const hud = page.getByTestId('story-hud');
    await expect(hud).toHaveAttribute('data-story-phase', 'gate');
    await expect(page.getByTestId('story-phase-label')).toContainText('01 / 07');

    // Callout is pinned to the canopy and lands inside the viewport
    const callout = page.getByTestId('story-callout');
    await expect(callout).toHaveAttribute('data-part-id', 'canopy-glass');
    await expect(callout).toBeVisible();
    const box = await callout.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1440);

    // Hotkey 3 → taxi, ground mode, landing light on
    await page.keyboard.press('3');
    await expect(hud).toHaveAttribute('data-story-phase', 'taxi');
    await expect(root).toHaveAttribute('data-scene-mode', 'showroom');
    await expect(page.getByTestId('story-toggle-landing')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('l');
    await expect(page.getByTestId('story-toggle-landing')).toHaveAttribute('aria-pressed', 'false');

    // Take-off plays the flight timeline and holds at 2.95s (no auto cutaway) with anchor XZ locked
    await page.keyboard.press('5');
    await expect(root).toHaveAttribute('data-scene-mode', 'flight-transition');
    await page.waitForFunction(
      () => window.__AERIS_DEBUG__!.getVisualClock().flightTimeSeconds >= 2.94,
      null,
      { timeout: 75000 }
    );
    await page.waitForTimeout(400);
    const held = await page.evaluate(() => {
      const c = window.__AERIS_DEBUG__!.getVisualClock();
      return { t: c.flightTimeSeconds, x: c.anchorWorldX, z: c.anchorWorldZ };
    });
    expect(held.t).toBeCloseTo(2.95, 2);
    await expect(page.getByTestId('story-toggle-cutaway')).toHaveAttribute('aria-pressed', 'false');
    expect(held.x).toBe(0);
    expect(held.z).toBe(0);

    // Climb (ArrowRight) → cutaway on, runs into hover
    await page.keyboard.press('ArrowRight');
    await expect(hud).toHaveAttribute('data-story-phase', 'climb');
    await expect(page.getByTestId('story-toggle-cutaway')).toHaveAttribute('aria-pressed', 'true');
    await expect(root).toHaveAttribute('data-scene-mode', 'hover', { timeout: 90000 });
    await page.screenshot({ path: 'proof/story-climb-cutaway.png' });

    // Cruise
    await page.keyboard.press('7');
    await expect(page.getByTestId('story-metric-value')).toHaveText('10,000', { timeout: 5000 });
    await page.screenshot({ path: 'proof/story-cruise.png' });

    // Esc exits and lands back on the turntable
    await page.keyboard.press('Escape');
    await expect(hud).toHaveCount(0);
    await expect(root).toHaveAttribute('data-scene-mode', 'showroom', { timeout: 90000 });

    expect(pageErrors).toEqual([]);
  });
});
