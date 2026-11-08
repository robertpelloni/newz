# Omnifeed (Newz) - Session Handoff & Architecture Notes

## Session Summary (v0.8.7)
In this release iteration, we added multi-criteria sorting to intelligence export reporting:
1. **Sorted Intelligence Exports (`GET /api/topics/export`)**:
   - Added `sort_by` query parameter support (`latest`, `articles`, `controversy`, `sentiment`) to CSV and JSON exports.
   - Included `controversy_score` and `sentiment_score` metrics in CSV headers and JSON payloads.
2. **Synchronized UI Export Handlers**:
   - Updated `handleExport()` in `frontend/src/app/page.tsx` to pass the active sorting state so downloaded CSV/JSON reports match the user's dashboard view.
3. **Automated Testing & End-to-End Verification**:
   - Added unit test `test_export_topics_with_sorting` in `backend/tests/test_api.py` (24/24 tests passing).
   - Executed Playwright automated offline verification suite (`scripts/test_offline_data_access.py`).
   - Verified Next.js build compilation (`npm run build`).
   - Synchronized single-source version `0.8.7` across `VERSION.md`, `frontend/src-tauri/tauri.conf.json`, `frontend/src-tauri/Cargo.toml`, `CHANGELOG.md`, `ROADMAP.md`, `TODO.md`, and `HANDOFF.md`.

## Active Runtime Environment:
- **Current Version**: v0.8.7 (tracked in `VERSION.md`).
- **Git Branch**: `jules-6192871868108129425-4e3e34d4`
- **Active Ports**:
  - FastAPI Backend: `http://localhost:8000` (PID managed, live telemetry delta streaming on `/api/ws/feed`)
  - Next.js Production Server: `http://localhost:3000` (PID managed)

## Next Steps for Successor Models:
- Optional: Add periodic automated background latency heartbeats for subscribed RSS sources.
- Optional: Add custom annotation tags for offline saved bookmarks.
