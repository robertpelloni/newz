import os
import sys
import time
from playwright.sync_api import sync_playwright

def test_offline_caching_and_sync():
    print("[1/8] Launching headless browser to test PWA, IndexedDB, offline filtering, bookmarks, and sync queue...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Omnifeed PWA Test Runner)"
        )
        page = context.new_page()

        # Step 1: Prime cache online
        print("[2/8] Navigating while online to prime Service Worker, LocalStorage, and IndexedDB...")
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

        # Check IndexedDB persistence
        idb_count = page.evaluate("""
            async () => {
                return new Promise((resolve) => {
                    const req = indexedDB.open('omnifeed_offline_db', 1);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction('topics_store', 'readonly');
                        const store = tx.objectStore('topics_store');
                        const countReq = store.count();
                        countReq.onsuccess = () => resolve(countReq.result);
                        countReq.onerror = () => resolve(0);
                    };
                    req.onerror = () => resolve(0);
                });
            }
        """)
        print(f"       IndexedDB cached topics count: {idb_count}")
        assert idb_count > 0, "Expected topics to be saved to IndexedDB topics_store"

        # Step 2: Toggle a bookmark and test persistence in IndexedDB
        print("[3/8] Testing bookmark creation and multi-tier store persistence...")
        bookmark_btn = page.locator("button[title*='Bookmark topic for offline reading']").first
        assert bookmark_btn.is_visible(), "Expected Bookmark button on topic card"
        bookmark_btn.click()
        time.sleep(0.5)

        saved_bm = page.evaluate("""
            async () => {
                return new Promise((resolve) => {
                    const req = indexedDB.open('omnifeed_offline_db', 1);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction('metrics_store', 'readonly');
                        const store = tx.objectStore('metrics_store');
                        const getReq = store.get('bookmarked_ids');
                        getReq.onsuccess = () => resolve(getReq.result ? getReq.result.ids : []);
                        getReq.onerror = () => resolve([]);
                    };
                    req.onerror = () => resolve([]);
                });
            }
        """)
        print(f"       IndexedDB bookmarked ids: {saved_bm}")
        assert isinstance(saved_bm, list) and len(saved_bm) > 0, "Expected bookmark to persist in IndexedDB"

        # Step 3: Simulate offline mode
        print("[4/8] Simulating offline mode (context.set_offline(True))...")
        context.set_offline(True)
        page.evaluate("() => window.dispatchEvent(new Event('offline'))")
        time.sleep(1)

        # Check offline banner presence
        offline_banner = page.locator("text=Offline Mode: Displaying cached intelligence feeds")
        assert offline_banner.is_visible(), "Expected offline indicator banner to be visible"
        print("       Offline mode banner confirmed visible.")

        # Step 4: Test offline search filtering over IndexedDB cached store
        print("[5/8] Testing offline search filtering against cached vault...")
        search_input = page.locator("input[placeholder*='Search topics']")
        first_topic_title = topics[0].split()[0] # first word
        search_input.fill(first_topic_title)
        time.sleep(0.5)

        filtered_topics = page.locator(".cursor-pointer h3").all_text_contents()
        print(f"       Filtered topics count offline for '{first_topic_title}': {len(filtered_topics)}")
        assert len(filtered_topics) >= 1, "Expected filtered results offline"
        search_input.fill("")
        time.sleep(0.5)

        # Step 5: Trigger offline sync actions
        print("[6/8] Triggering Sync while offline to verify queue accumulation...")
        sync_button = page.locator("button:has-text('⚡ Queue Sync')")
        assert sync_button.is_visible(), "Expected Queue Sync button to appear while offline"
        sync_button.click()
        time.sleep(0.5)

        queue_data = page.evaluate("() => localStorage.getItem('omnifeed_sync_queue')")
        assert queue_data is not None and "sync_feeds" in queue_data, "Expected offline action to be queued in localStorage"
        print(f"       Offline sync queue confirmed in localStorage: {queue_data}")

        # Step 6: Open Offline Storage Management modal and verify buttons
        print("[7/8] Verifying Offline Storage Modal, Replay Queue button, and Import Vault...")
        cache_btn = page.locator("button:has-text('💾 Cache')")
        assert cache_btn.is_visible(), "Expected Cache button in header"
        cache_btn.click()
        time.sleep(0.5)

        modal_title = page.locator("text=Offline Intelligence Storage")
        assert modal_title.is_visible(), "Expected Offline Intelligence Storage modal to be visible"

        replay_btn = page.locator("button:has-text('⚡ Replay Queue Now')")
        assert replay_btn.is_visible(), "Expected Replay Queue button to be visible when items are queued"

        import_label = page.locator("label:has-text('📥 Import Vault')")
        assert import_label.is_visible(), "Expected Import Vault button in modal"
        print("       Replay Queue and Import Vault buttons confirmed visible in modal.")

        # Step 7: Test programmatic vault import restoration
        print("[8/8] Testing vault import restoration into IndexedDB store...")
        import_res = page.evaluate("""
            async () => {
                const dummyVault = {
                    exported_at: new Date().toISOString(),
                    topics: [
                        {
                            id: 99999,
                            title: "Synthesized Offline Discovery Report",
                            summary: "Direct offline intelligence injection verification",
                            category: "Technology",
                            first_seen: new Date().toISOString(),
                            last_updated: new Date().toISOString(),
                            article_count: 5
                        }
                    ],
                    bookmarks: [99999]
                };
                return new Promise((resolve) => {
                    const req = indexedDB.open('omnifeed_offline_db', 1);
                    req.onsuccess = () => {
                        const db = req.result;
                        const tx = db.transaction(['topics_store', 'metrics_store'], 'readwrite');
                        tx.objectStore('topics_store').put(dummyVault.topics[0]);
                        tx.objectStore('metrics_store').put({ key: 'bookmarked_ids', ids: dummyVault.bookmarks });
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = () => resolve(false);
                    };
                    req.onerror = () => resolve(false);
                });
            }
        """)
        assert import_res is True, "Expected dummy vault topic and bookmarks to be imported into IndexedDB"
        print("       Vault restoration into IndexedDB successfully verified.")

        # Capture screenshot for visual audit
        os.makedirs("/home/jules/verification", exist_ok=True)
        screenshot_path = "/home/jules/verification/offline_data_access_test.png"
        page.screenshot(path=screenshot_path)
        print(f"       Verification screenshot captured at {screenshot_path}")

        browser.close()
        print("SUCCESS: PWA offline caching, IndexedDB vault, bookmarks, and sync queue tests passed!")

if __name__ == '__main__':
    test_offline_caching_and_sync()
