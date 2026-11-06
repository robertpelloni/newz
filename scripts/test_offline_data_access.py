import os
import sys
import time
from playwright.sync_api import sync_playwright

def test_offline_caching_and_sync():
    print("[1/4] Launching headless browser to test PWA offline caching...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Omnifeed PWA Test Runner)"
        )
        page = context.new_page()

        # Step 1: Prime cache online
        print("[2/4] Navigating while online to prime Service Worker and LocalStorage...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        time.sleep(2)

        # Check topics loaded
        topics = page.locator(".cursor-pointer h3").all_text_contents()
        print(f"       Topics loaded while online: {len(topics)}")
        assert len(topics) > 0, "Expected topics to be rendered while online"

        # Check localStorage cache
        cached_topics = page.evaluate("() => localStorage.getItem('omnifeed_cached_topics')")
        assert cached_topics is not None, "Expected omnifeed_cached_topics to be populated in localStorage"
        print("       LocalStorage topics cache successfully verified.")

        # Step 2: Simulate offline mode
        print("[3/4] Simulating offline mode (context.set_offline(True))...")
        context.set_offline(True)
        page.evaluate("() => window.dispatchEvent(new Event('offline'))")
        time.sleep(1)

        # Check offline banner presence
        offline_banner = page.locator("text=Offline Mode: Displaying cached intelligence feeds")
        assert offline_banner.is_visible(), "Expected offline indicator banner to be visible"
        print("       Offline mode banner confirmed visible.")

        # Step 3: Test offline sync queue
        print("[4/4] Triggering Sync while offline to verify queue accumulation...")
        sync_button = page.locator("button:has-text('⚡ Queue Sync')")
        assert sync_button.is_visible(), "Expected Queue Sync button to appear while offline"
        sync_button.click()
        time.sleep(0.5)

        queue_data = page.evaluate("() => localStorage.getItem('omnifeed_sync_queue')")
        assert queue_data is not None and "sync_feeds" in queue_data, "Expected offline action to be queued in localStorage"
        print(f"       Offline sync queue confirmed in localStorage: {queue_data}")

        # Capture screenshot for visual audit
        os.makedirs("/home/jules/verification", exist_ok=True)
        screenshot_path = "/home/jules/verification/offline_data_access_test.png"
        page.screenshot(path=screenshot_path)
        print(f"       Verification screenshot captured at {screenshot_path}")

        browser.close()
        print("SUCCESS: PWA offline caching and sync queue test passed!")

if __name__ == '__main__':
    test_offline_caching_and_sync()
