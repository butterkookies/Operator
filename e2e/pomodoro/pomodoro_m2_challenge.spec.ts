import { test, expect } from '@playwright/test';

test.describe('Pomodoro M2 Challenge', () => {
  test('Presets work and auto-cycle logic functions properly', async ({ page }) => {
    // We install the clock before navigating
    await page.clock.install({ time: new Date() });

    await page.goto('/test-pomodoro');

    // Wait for the app to be fully loaded
    await expect(page.locator('text=DEEP WORK')).toBeVisible();

    // Verify presets exist
    const focusBtn = page.getByRole('button', { name: 'Focus' });
    const shortBreakBtn = page.getByRole('button', { name: 'Short Break' });
    const longBreakBtn = page.getByRole('button', { name: 'Long Break' });

    await expect(focusBtn).toBeVisible();
    await expect(shortBreakBtn).toBeVisible();
    await expect(longBreakBtn).toBeVisible();

    // Make sure initial time is 25:00
    await expect(page.locator('text=25:00')).toBeVisible();

    // Click short break
    await shortBreakBtn.click();
    await expect(page.locator('text=05:00')).toBeVisible();

    // Click long break
    await longBreakBtn.click();
    await expect(page.locator('text=15:00')).toBeVisible();

    // Return to focus and play
    await focusBtn.click();
    await expect(page.locator('text=25:00')).toBeVisible();

    // Find the play button. It has a Play icon, or we can find by button structure.
    // The play button is one of the buttons with size 24 (since it has `<Play size={24} />`) or just the first button in the group.
    // Actually we can find it by finding the button that contains SVG with lucide-play
    // Or we can just click the 4th button (since Focus, Short Break, Long Break are the first 3). Wait, Dashboard might have other buttons.
    // Let's use getByRole('button').nth(...) or better, finding the button near the time display.
    const timeDisplay = page.locator('div.font-mono.text-6xl');
    
    // Instead of clicking the button blindly, we can find the SVG Play
    const playButton = page.locator('button:has(svg.lucide-play)');
    await expect(playButton).toBeVisible();
    await playButton.click();

    // Now fast forward 25 minutes
    await page.clock.fastForward(25 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // It should now automatically switch to short break.
    await expect(page.getByText('SHORT BREAK', { exact: true })).toBeVisible();
    await expect(page.locator('text=05:00')).toBeVisible();

    // It's paused, so we need to start it again.
    const playButtonAfterBreak = page.locator('button:has(svg.lucide-play)');
    await playButtonAfterBreak.click();
    await page.clock.fastForward(5 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // Focus 2
    await expect(page.locator('div.tracking-\\[0\\.2em\\]', { hasText: 'DEEP WORK' })).toBeVisible();
    await expect(page.locator('text=25:00')).toBeVisible();
    await page.locator('button:has(svg.lucide-play)').click();
    await page.clock.fastForward(25 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // Break 2
    await expect(page.locator('div.tracking-\\[0\\.2em\\]', { hasText: 'SHORT BREAK' })).toBeVisible();
    await expect(page.locator('text=05:00')).toBeVisible();
    await page.locator('button:has(svg.lucide-play)').click();
    await page.clock.fastForward(5 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // Focus 3
    await expect(page.locator('div.tracking-\\[0\\.2em\\]', { hasText: 'DEEP WORK' })).toBeVisible();
    await expect(page.locator('text=25:00')).toBeVisible();
    await page.locator('button:has(svg.lucide-play)').click();
    await page.clock.fastForward(25 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // Break 3
    await expect(page.locator('div.tracking-\\[0\\.2em\\]', { hasText: 'SHORT BREAK' })).toBeVisible();
    await expect(page.locator('text=05:00')).toBeVisible();
    await page.locator('button:has(svg.lucide-play)').click();
    await page.clock.fastForward(5 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // Focus 4
    await expect(page.getByText('DEEP WORK')).toBeVisible();
    await expect(page.locator('text=25:00')).toBeVisible();
    await page.locator('button:has(svg.lucide-play)').click();
    await page.clock.fastForward(25 * 60 * 1000 + 1000);
    await page.waitForTimeout(100);

    // Break 4: Should be Long Break
    await expect(page.locator('div.tracking-\\[0\\.2em\\]', { hasText: 'LONG BREAK' })).toBeVisible();
    await expect(page.locator('text=15:00')).toBeVisible();
  });
});
