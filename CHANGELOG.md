# CHANGELOG

Document every adjustment. Track a single, global version string/date/build number sourced from `VERSION.md`.

## [0.5.9] - 2026-10-24
### Added
- Curated Reading List Export in Markdown and JSON formats (`handleExportBookmarks`) for offline intelligence briefs and reporting.
- Restructured universal Export dropdown dividing standard filtered feed topics from starred reading list exports.
- Verified visual menu layout and blob generation via Playwright automated headless tests.
- All 14 backend unit and integration tests passing.

## [0.5.8] - 2026-10-24
### Added
- Client-side topic bookmarking and offline persistence: star bookmark toggle buttons on topic cards, in-modal bookmarking actions, and automatic localStorage synchronization (`omnifeed_bookmarks`).
- Interactive "★ Bookmarks" category filter button with real-time bookmarked count badge for zero-friction access to saved clusters.
- Verified persistent state across reloads and offline caching with Playwright headless test and screenshot validation.
- All 14 backend unit and integration tests passing.

## [0.5.7] - 2026-10-24
### Added
- Upgraded `frontend/public/sw.js` with dedicated `omnifeed-api-v2` cache bucket using Network-First with Cache Fallback for all `/api/` GET requests.
- Implemented automatic local storage backup caching and seamless recovery for topic intelligence in `frontend/src/app/page.tsx`.
- Created Playwright offline verification test (`/home/jules/verification/verify_pwa_offline.py`) and visually confirmed amber offline banner with cached topic rendering.
- Developed `/home/jules/self_created_tools/pwa_validator.py` for automated PWA asset and service worker compliance checking.
- Maintained 100% test pass rate across backend test suite (14/14).

## [0.5.6] - 2026-10-24
### Added
- Refined Tauri v2 desktop application bundle with `build.rs`, application icons (`icon.png`, `32x32.png`, `128x128.png`), and `tauri::Builder` runner in `frontend/src-tauri/src/main.rs`.
- Enhanced offline user experience with online/offline connectivity listeners and reactive status banners in `frontend/src/app/page.tsx`.
- All 14 backend unit and integration tests passing.

## [0.5.5] - 2026-10-24
### Added
- Explicit Deep Architectural Component Specifications in `README.md` detailing Component 1 (Multi-Source Data Ingestion Engine), Component 2 (Processing & Enrichment Pipeline), and Component 3 (Consolidated Presentation Layer).
- Fully documented backend, worker, frontend, and desktop subsystems.
- All 14 unit and integration tests passing.

## [0.5.4] - 2026-10-24
### Added
- Rich narrative evolution metadata (`source_type`, `polarity`, standardized timezone-aware UTC timestamps) in `worker/tasks.py`.
- Strict chronological timeline sorting when correlating new wire and social firehose articles.
- Visual timeline presentation updates in `frontend/src/app/page.tsx` displaying source badges, sentiment chips, and formatted timestamps.
- Automated unit test `test_chronological_timeline_metadata_and_ordering` in `backend/tests/test_api.py` (14/14 tests passing).

## [0.5.3] - 2026-10-24
### Added
- Dynamic single-source versioning helper (`get_app_version()`) in `backend/main.py` directly loading from `VERSION.md`.
- Synchronized API metadata, root route, and telemetry responses to `VERSION.md`.
- All 13 unit and integration tests passing.

## [0.5.2] - 2026-10-24
### Added
- Comprehensive multi-source and social data flow architecture design diagram in `README.md`.
- Formal mathematical Jaccard similarity and narrative evolution clustering specifications.
- Synchronized architecture tenets in `VISION.md` and design observations in `MEMORY.md`.
- All backend unit and integration tests passing (13/13).

## [0.5.1] - 2026-10-24
### Added
- Progressive Web App (PWA) manifest in `frontend/public/manifest.json`.
- Offline caching service worker in `frontend/public/sw.js` with stale-while-revalidate strategy.
- Automated service worker registration in `frontend/src/app/page.tsx` and PWA viewport/manifest metadata in `frontend/src/app/layout.tsx`.
- Verified production build and passing backend test suite (13/13).

## [0.5.0] - 2026-10-24
### Added
- Native cross-platform desktop bundle support using Tauri v2 in `frontend/src-tauri/`.
- Configured Tauri desktop window parameters, application identifiers, system tray integration, and custom protocol handlers.
- Configured Next.js static HTML export mode (`output: 'export'`) in `frontend/next.config.ts`.
- Added desktop workflow scripts (`tauri:dev`, `tauri:build`) in `frontend/package.json`.
- Verified static export build artifacts in `frontend/out/`.

## [0.4.0] - 2026-10-24
### Added
- Local LLM / Ollama bulleted summary generation bridge in `worker/tasks.py` with multi-source heuristic fallback.
- Topic summarization endpoint `/api/topics/{id}/summarize` in `backend/main.py`.
- Interactive "✨ Synthesized Intelligence" card and "⚡ Refresh AI Summary" action in frontend topic deep-dive modal (`frontend/src/app/page.tsx`).
- Real-time social firehose streaming via Bluesky AT Protocol Jetstream and Mastodon Fediverse (`/api/firehose/simulate`).
- Live WebSocket `firehose_pulse` event broadcast and frontend streaming toast notifications.
- Automated unit test suite additions covering AI summarization and firehose streaming (13/13 passing tests).

## [0.3.0] - 2026-10-24
### Added
- Unsupervised entity extraction in worker pipeline (`worker/tasks.py`) extracting proper nouns and high-value entities from correlated articles.
- Chronological narrative evolution timeline marker generation, linking milestone events across multiple news wire sources.
- Persisted `entities_json` and `timeline_json` fields to `Topic` model in `backend/models.py`.
- Topic details API endpoint `/api/topics/{id}` serialization of entity tags and chronological narrative evolution milestones.
- Interactive deep-dive modal UI updates in `frontend/src/app/page.tsx` displaying "Key Extracted Entities" badges and a visual "Narrative Evolution Timeline".
- Automated unit test `test_topic_detail_entities_and_timeline` in `backend/tests/test_api.py`.
- Updated database migrations and local SQLite schema backfills.

## [0.2.2] - 2026-10-24
### Added
- Server-side pagination metadata in `/api/topics` (`page`, `page_size`, `total`, `total_pages`).
- Interactive pagination navigation controls in the frontend dashboard (Next, Previous, and numbered page selectors).
- Automated unit test suite additions for topic pagination validation (`test_get_topics_pagination`).
- Aligned internal version identifiers across backend telemetry to v0.2.2.

## [0.2.1] - 2026-10-24
### Added
- Real-time WebSocket feed endpoint `/api/ws/feed` and connection manager in `backend/main.py`.
- Topic intelligence export endpoint `/api/topics/export` supporting CSV and JSON download.
- Live WebSocket auto-refresh and animated notification toast in `frontend/src/app/page.tsx`.
- Interactive CSV/JSON Export dropdown and OLED high-contrast mode toggle in dashboard header.
- Automated unit tests covering topic exports (JSON/CSV) and WebSocket duplex communication in `backend/tests/test_api.py`.

## [0.2.0] - 2026-10-24
### Added
- Dynamic SQLite database fallback (`sqlite:///./omnifeed.db`) if PostgreSQL is unavailable.
- Expanded FastAPI surface: `/api/system/status`, `/api/sources`, `/api/topics` (with search and category filtering), `/api/topics/{id}`, `/api/sentiment/pulse`, `/api/actions/sync`, and `/api/system/shutdown`.
- Unsupervised token-based Jaccard topic similarity clustering and lexicon polarity scoring in `worker/tasks.py`.
- Consolidated single-page operations dashboard in Next.js 15 + Tailwind CSS v4 (`frontend/src/app/page.tsx`).
- Deep-dive topic cluster exploration modal with source correlation and community social discussions.
- System tray & server lifecycle controller in `scripts/system_tray.py` (`--status`, `--sync`, `--open`, `--stop`).
- Unit and integration tests for API endpoints in `backend/tests/test_api.py`.
- Core documentation governance files (`VISION.md`, `MEMORY.md`, `DEPLOY.md`, `IDEAS.md`, `ROADMAP.md`, `TODO.md`, `HANDOFF.md`, `VERSION.md`).

## [0.1.1] - 2026-10-17
### Added
- Recreated missing documentation files.
- Prepared Alembic database deployment script.

## [0.1.0] - 2026-10-17
### Added
- Initial project scaffolding for Omnifeed.
- Core documentation files.
- Backend (FastAPI), Worker (Celery), and Frontend (Next.js) directories.
- `docker-compose.yml` for PostgreSQL and Redis.

## [0.1.2] - 2026-10-23
### Added
- RSS ingestion logic and mock tasks for Reddit API and AI summarization.
- Fixed pgvector fallback in Alembic migrations.
- Added database dependencies to worker requirements.
