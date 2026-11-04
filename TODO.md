# Granular TODO & Immediate Engineering Backlog

## High Priority
- [x] Unify SQLite fallback in `backend/database.py`.
- [x] Implement `/api/system/status`, `/api/sources`, `/api/sentiment/pulse`, `/api/actions/sync`, and `/api/system/shutdown`.
- [x] Create multi-source RSS/JSON ingestion pipeline and unsupervised Jaccard clustering.
- [x] Build standalone system tray and server controller script (`scripts/system_tray.py`).
- [x] Rebuild single-page ultra-dense dashboard in Next.js 15 with Tailwind CSS v4.
- [x] Add detailed modal deep-dive for topic clusters.
- [ ] Implement live WebSocket notifications on `/api/ws/feed` for streaming new topics.
- [ ] Add bookmarking / topic export functionality to JSON/CSV directly from the UI.

## Polish & Optimization
- [x] Provide tooltip guides on every metric and sentiment calculation.
- [x] Configure Tailwind v4 PostCSS compilation.
- [ ] Add dark / high-contrast OLED mode toggle in dashboard header.
- [ ] Implement pagination or virtualized scrolling for topic lists exceeding 100 entries.
