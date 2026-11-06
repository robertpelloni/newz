# Granular TODO & Immediate Engineering Backlog

## High Priority
- [x] Unify SQLite fallback in `backend/database.py`.
- [x] Implement `/api/system/status`, `/api/sources`, `/api/sentiment/pulse`, `/api/actions/sync`, and `/api/system/shutdown`.
- [x] Create multi-source RSS/JSON ingestion pipeline and unsupervised Jaccard clustering.
- [x] Build standalone system tray and server controller script (`scripts/system_tray.py`).
- [x] Rebuild single-page ultra-dense dashboard in Next.js 15 with Tailwind CSS v4.
- [x] Add detailed modal deep-dive for topic clusters.
- [x] Implement live WebSocket notifications on `/api/ws/feed` for streaming new topics.
- [x] Add bookmarking / topic export functionality to JSON/CSV directly from the UI.
- [x] Extract named entities (people, organizations, concepts) and chronological timeline evolution markers into `Topic` model.
- [x] Surface extracted entities and narrative timeline in the topic cluster modal deep-dive.

## Polish & Optimization
- [x] Provide tooltip guides on every metric and sentiment calculation.
- [x] Configure Tailwind v4 PostCSS compilation.
- [x] Add dark / high-contrast OLED mode toggle in dashboard header.
- [x] Implement pagination or virtualized scrolling for topic lists exceeding 100 entries.
- [x] Connect direct local LLM (Ollama) summary generator.
- [x] Integrate Bluesky AT Protocol firehose subscriber.
- [x] Implement Tauri v2 desktop application wrapper configuration (`frontend/src-tauri/`).
- [x] Add Next.js static build export configuration for desktop bundling.
- [x] Implement mobile PWA service worker with offline cache fallback (`manifest.json` and `sw.js`).
- [x] Complete end-to-end data flow architecture diagram and ingestion documentation in README.md.
- [x] Implement dynamic single-source versioning helper in `backend/main.py` referencing `VERSION.md`.
- [x] Enrich topic timeline tracking with chronologically sorted, rich correlation metadata and polarity indicators.
- [x] Detail Deep Architectural Component Specifications in README.md.
