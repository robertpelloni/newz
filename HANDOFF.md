# Omnifeed (Newz) - Session Handoff & Architecture Notes

## Session Summary (v0.8.1)
In this release iteration, we added multi-criteria topic sorting and offline sorting capabilities:
1. **Multi-Criteria Topic Sorting in API (`GET /api/topics?sort_by=...`)**:
   - Supported `sort_by` query parameters: `latest` (recency), `articles` (source volume density), `controversy` (controversy score), and `sentiment` (polarity magnitude).
2. **Interactive UI Sort Selector with Offline Parity**:
   - Added interactive sort selector in `frontend/src/app/page.tsx` global filter bar.
   - Wired client-side sorting into `fetchTopics()` to dynamically sort cached topics directly from IndexedDB when offline.
3. **Automated Testing & End-to-End Verification**:
   - Added unit test `test_get_topics_multi_criteria_sorting` in `backend/tests/test_api.py` (19/19 tests passing).
   - Executed Playwright automated offline verification suite (`scripts/test_offline_data_access.py`).
   - Verified Next.js build compilation (`npm run build`).
   - Synchronized single-source version `0.8.1` across `VERSION.md`, `frontend/src-tauri/tauri.conf.json`, `frontend/src-tauri/Cargo.toml`, `CHANGELOG.md`, `ROADMAP.md`, `TODO.md`, and `HANDOFF.md`.

## Active Runtime Environment:
- **Current Version**: v0.8.1 (tracked in `VERSION.md`).
- **Git Branch**: `jules-6192871868108129425-4e3e34d4`
- **Active Ports**:
  - FastAPI Backend: `http://localhost:8000` (PID managed, live telemetry delta streaming on `/api/ws/feed`)
  - Next.js Production Server: `http://localhost:3000` (PID managed)

## Next Steps for Successor Models:
- Optional: Add periodic automated background latency heartbeats for subscribed RSS sources.
- Optional: Add custom annotation tags for offline saved bookmarks.
