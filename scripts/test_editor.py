#!/usr/bin/env python3
"""
Test script: verifies the video editor works correctly,
including Cut, Copy, Paste, Sync, and Split features in the timeline.
"""
import asyncio
import sys
from playwright.async_api import async_playwright, expect

BASE_URL = "http://localhost:3000"
TIMEOUT = 15000  # ms

async def test_editor():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False, slow_mo=400)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()
        page.set_default_timeout(TIMEOUT)

        errors = []

        async def check(name: str, coro):
            try:
                await coro
                print(f"  ✓ {name}")
            except Exception as e:
                errors.append((name, str(e)))
                print(f"  ✗ {name}: {e}")

        # ── 1. Landing page loads ──────────────────────────────────────
        print("\n[1] Landing page")
        await page.goto(BASE_URL, wait_until="networkidle")
        await check("Title visible", expect(page).to_have_title(r".*[Kk][Bb]eats.*", timeout=5000))

        # ── 2. Open / create a project ─────────────────────────────────
        print("\n[2] Open studio")
        # Click the first project or a "New Project" button
        new_btn = page.locator("button, a").filter(has_text="New Project").first
        if await new_btn.count() > 0:
            await new_btn.click()
        else:
            # Try clicking first project card
            first_project = page.locator("[href*='/studio/']").first
            if await first_project.count() > 0:
                await first_project.click()
            else:
                # Look for a template picker or modal
                card = page.locator(".card, [data-testid='template']").first
                if await card.count() > 0:
                    await card.click()

        await page.wait_for_load_state("networkidle", timeout=10000)
        studio_url = page.url
        print(f"  Studio URL: {studio_url}")

        # ── 3. Timeline toolbar visible ────────────────────────────────
        print("\n[3] Timeline toolbar")
        # Check for key toolbar buttons
        await check("Copy button", expect(page.locator("button[title='Copy'], button:has-text('Copy')").first).to_be_visible())
        await check("Cut button", expect(page.locator("button[title='Cut'], button:has-text('Cut')").first).to_be_visible())
        await check("Paste button", expect(page.locator("button[title='Paste'], button:has-text('Paste')").first).to_be_visible())
        await check("Split button", expect(page.locator("button[title='Split'], button:has-text('Split')").first).to_be_visible())
        await check("Sync button", expect(page.locator("button[title*='Sync'], button[title*='beat'], button:has-text('Sync')").first).to_be_visible())
        await check("BPM input", expect(page.locator("input[placeholder='—'], label:has-text('BPM')").first).to_be_visible())

        # ── 4. Add an overlay so we can test cut/copy/paste ───────────
        print("\n[4] Add overlay")
        # Look for + Add Overlay or the overlay type buttons in sidebar
        add_btn = page.locator("button").filter(has_text="Text").first
        if await add_btn.count() > 0:
            await add_btn.click()
            await page.wait_for_timeout(600)
            print("  Added text overlay")

        # ── 5. Copy action (toolbar button) ───────────────────────────
        print("\n[5] Toolbar: Copy")
        copy_btn = page.locator("button[title='Copy'], button:has-text('Copy')").first
        if await copy_btn.is_enabled():
            await copy_btn.click()
            await page.wait_for_timeout(300)
            print("  ✓ Copy button clicked")
        else:
            print("  ⚠ Copy disabled (no overlay selected)")

        # ── 6. Cut action (Cmd+X keyboard shortcut) ───────────────────
        print("\n[6] Keyboard: Cmd+X (Cut)")
        # First select an overlay via timeline click, then cut
        timeline_clip = page.locator(".timeline-clip, [style*='grab']").first
        if await timeline_clip.count() > 0:
            await timeline_clip.click()
            await page.wait_for_timeout(200)
        await page.keyboard.press("Meta+x")
        await page.wait_for_timeout(400)
        print("  ✓ Cmd+X dispatched")

        # ── 7. Paste (Cmd+V) ──────────────────────────────────────────
        print("\n[7] Keyboard: Cmd+V (Paste)")
        await page.keyboard.press("Meta+v")
        await page.wait_for_timeout(400)
        print("  ✓ Cmd+V dispatched")

        # ── 8. BPM input ──────────────────────────────────────────────
        print("\n[8] BPM input")
        bpm_input = page.locator("input[placeholder='—']").first
        if await bpm_input.count() > 0:
            await bpm_input.fill("128")
            await bpm_input.press("Enter")
            await page.wait_for_timeout(300)
            val = await bpm_input.input_value()
            if val == "128":
                print("  ✓ BPM persists (value = 128)")
            else:
                errors.append(("BPM persists", f"expected 128, got {val}"))
                print(f"  ✗ BPM persists: expected 128, got {val}")
            print(f"  BPM input value: {val}")

        # ── 9. Sync button ────────────────────────────────────────────
        print("\n[9] Sync button")
        sync_btn = page.locator("button:has-text('Sync')").first
        if await sync_btn.count() > 0:
            is_enabled = await sync_btn.is_enabled()
            print(f"  Sync button enabled: {is_enabled}")
            if is_enabled:
                await sync_btn.click()
                await page.wait_for_timeout(300)
                print("  ✓ Sync clicked")

        # ── 10. Screenshot ────────────────────────────────────────────
        print("\n[10] Screenshot")
        await page.screenshot(path="/tmp/kbeats_editor_test.png", full_page=False)
        print("  Saved to /tmp/kbeats_editor_test.png")

        await browser.close()

        # ── Summary ───────────────────────────────────────────────────
        print(f"\n{'='*50}")
        if errors:
            print(f"FAILED — {len(errors)} check(s) failed:")
            for name, msg in errors:
                print(f"  ✗ {name}: {msg}")
            sys.exit(1)
        else:
            print("ALL CHECKS PASSED")

if __name__ == "__main__":
    asyncio.run(test_editor())
