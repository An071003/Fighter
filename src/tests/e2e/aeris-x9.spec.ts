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
});
