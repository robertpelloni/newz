# CHANGELOG

Document every adjustment. Track a single, global version string/date/build number sourced from `VERSION.md`.

## [0.8.2] - 2026-11-07
### Added
- Autopilot background ingestion settings API (`GET` & `POST /api/settings/autopilot`) enabling automated dynamic scheduling and state inspection.
- Interactive "⚡ Autopilot" toggle button in the dashboard navbar (`frontend/src/app/page.tsx`) with real-time status pulses and tooltips.
- Automated unit test `test_autopilot_settings_lifecycle` in `backend/tests/test_api.py` (20/20 tests passing).

## [0.8.1] - 2026-11-07
### Added
- Multi-criteria topic sorting in backend API (`GET /api/topics?sort_by=...`), supporting ordering by recent updates (`latest`), article volume (`articles`), controversy level (`controversy`), and sentiment extremity (`sentiment`).
- Interactive sort selector dropdown in the global controls bar of `frontend/src/app/page.tsx`, supporting both online dynamic API sorting and offline IndexedDB client-side sorting.
- Automated unit test `test_get_topics_multi_criteria_sorting` in `backend/tests/test_api.py` validating sort ordering across all criteria (19/19 tests passing).

## [0.8.0] - 2026-11-07
### Added
- Multi-tier bookmark persistence layer synchronizing saved reading list IDs across both IndexedDB (`metrics_store`) and `localStorage` (`omnifeed_bookmarks`).
- Offline Vault bundle export and restoration now includes saved reading list bookmarks (`omnifeed_offline_vault_*.json`), enabling complete cross-machine bookmark preservation.
- Extended automated Playwright test suite in `scripts/test_offline_data_access.py` to validate bookmark creation, persistence, and vault restoration.

## [0.7.9] - 2026-11-07
### Added
- Concurrent bulk feed health diagnostics and latency probing endpoint `POST /api/sources/ping-all` in `backend/main.py`.
- Interactive "⚡ Ping All Feeds" button in the Feeds modal in `frontend/src/app/page.tsx` with instant batch health updates and offline local storage caching.
- Automated backend unit test `test_feed_sources_bulk_health_ping` verifying concurrent health status across all registered sources (18/18 tests passing).

## [0.7.8] - 2026-11-07
### Added
- Offline intelligence vault file import (`importOfflineVault`) and restoration button (`📥 Import Vault`) in the Offline Storage Manager modal.
- Persistent offline feed source health diagnostics and latency metrics stored in `omnifeed_sources_cache` for inspection in disconnected contexts.
- Extended automated Playwright verification in `scripts/test_offline_data_access.py` testing vault import restoration into IndexedDB.

## [0.7.7] - 2026-11-07
### Added
- Offline topic filtering and full-text keyword search directly executed over the IndexedDB persistent cache.
- Heuristic offline AI bullet briefing synthesis in `handleSummarize()`, allowing immediate cluster summaries when disconnected and saving updates to the local IndexedDB vault.
- Extended automated Playwright test suite in `scripts/test_offline_data_access.py` validating offline search queries and result rendering.

## [0.7.6] - 2026-11-07
### Added
- Multi-action offline synchronization queue supporting `add_feed`, `delete_feed`, and `sync_feeds` actions with optimistic UI feedback.
- Interactive queue inspection and instant manual queue replay button (`⚡ Replay Queue Now`) in the Offline Storage Manager modal.
- Extended Playwright automated test suite in `scripts/test_offline_data_access.py` to validate multi-action queue buildup and modal replay buttons.

## [0.7.5] - 2026-11-07
### Added
- Native Tauri v2 desktop integration refinement with runtime `get_desktop_info` command handler and dynamic build version logging.
- Enhanced cross-platform desktop runtime detection in `frontend/src/app/page.tsx` recognizing both `__TAURI__` and `__TAURI_INTERNALS__` objects.
- Dynamically synchronized Tauri build validation in `scripts/build_offline_distribution.sh` matching single-source `VERSION.md`.

## [0.7.4] - 2026-11-07
### Added
- Bi-directional WebSocket real-time streaming with immediate telemetry snapshots and topic delta delivery upon client connection handshake (`/api/ws/feed`).
- Interactive WebSocket client commands supporting `{"action": "request_snapshot"}` for on-demand live state retrieval.
- Automated client-side IndexedDB synchronization on live WebSocket delta events, keeping the offline intelligence vault continuously primed with incoming stories.
- Automated backend unit test `test_websocket_immediate_snapshot_and_request_action` validating WebSocket handshake, payload structure, and client request actions.

## [0.7.3] - 2026-11-07
### Added
- Client-side IndexedDB persistent storage vault (`frontend/src/utils/offlineStore.ts`) providing robust offline storage for clustered topics, detailed articles, and storage telemetry metrics.
- Interactive Offline Storage & Cache Manager modal accessible via the navigation header (`💾 Cache`), displaying stored topic counts, deep-dive detail counts, estimated byte footprint, and pending background sync queues.
- Offline Vault JSON archive export capability, enabling offline backups and data portability even in fully air-gapped environments.
- Selective offline cache purging and real-time storage metrics recalculation.
- Enhanced Playwright automated offline verification suite in `scripts/test_offline_data_access.py` testing IndexedDB record counts and modal interactions.

## [0.7.2] - 2026-10-24
### Added
- Synchronized Tauri desktop configuration bundle version to v0.7.2 in `frontend/src-tauri/tauri.conf.json`.
- Enhanced `scripts/build_offline_distribution.sh` with automated schema, version, and icon validation for Tauri v2 native desktop builds.
- Refined cross-platform runtime indicator badge in `frontend/src/app/page.tsx` with offline capability and sync queue guidance.
- Verified offline caching and queue operations across PWA and desktop configurations via Playwright test suite (`verify_platform_offline.py` and `scripts/test_offline_data_access.py`).
- All 16 backend unit and integration tests passing.

## [0.7.1] - 2026-10-24
### Added
- Feed Source Health Diagnostics & Latency Probing endpoint `POST /api/sources/{id}/ping` in `backend/main.py`.
- Response schemas `SourcePingResponse` and health metadata attributes (`status`, `latency_ms`) in `backend/schemas.py`.
- Interactive "⚡ Ping" action button on feed cards with real-time health indicator chips (`● healthy (<latency>ms)`) in `frontend/src/app/page.tsx`.
- Automated test `test_feed_source_health_ping` in `backend/tests/test_api.py` (16/16 backend tests passing).
- Verified feed health probe visual interactions via Playwright test (`verify_feed_ping.py`).

## [0.7.0] - 2026-10-24
### Added
- Upgraded Service Worker (`frontend/public/sw.js`) to cache buckets `omnifeed-static-v3` and `omnifeed-api-v3`.
- Implemented Service Worker Background Sync (`sync-omnifeed-queue`) and duplex client messaging handlers (`TRIGGER_QUEUE_REPLAY`, `BACKGROUND_SYNC_COMPLETED`, `SKIP_WAITING`, `PURGE_EXPIRED_CACHES`).
- Enhanced client-side service worker hooks in `frontend/src/app/page.tsx` registering `sync-omnifeed-queue` when queuing actions while disconnected.
- Enhanced PWA validation script (`scripts/validate_pwa.py`) checking Background Sync handlers, message dispatchers, and manifest compliance.
- Updated `DEPLOY.md`, `README.md`, and `VISION.md` with complete documentation for offline data synchronization.
- Verified PWA offline sync workflow via Playwright (`verify_pwa_sync.py`), offline distribution build (`scripts/build_offline_distribution.sh`), and 15/15 passing backend unit tests.

## [0.6.9] - 2026-10-24
### Added
- Optimized WebSocket broadcast streaming in `backend/main.py` with delta updates (`recent_topics`), live telemetry counts, and sentiment metrics delivered directly over the active socket.
- Added live snapshot telemetry helper `get_live_telemetry_snapshot(db)` in `backend/main.py`.
- Instantaneous client-side state merging in `frontend/src/app/page.tsx` directly inserting WebSocket topic deltas into page 1 clusters and updating telemetry counters without requiring full round-trip HTTP refetches.
- Added automated unit test `test_websocket_optimized_broadcast_payload` in `backend/tests/test_api.py` (16/16 tests passing).
- Verified WebSocket live broadcast streaming and instant UI updates via Playwright test suite (`verify_websocket_streaming_optimization.py`).

## [0.6.8] - 2026-10-24
### Added
- Integrated custom subscribed feeds directly into ingestion and clustering pipeline in `worker/tasks.py`.
- Added per-feed `article_count` productivity metrics in `GET /api/sources` and `backend/schemas.py`.
- Displayed live article count badges on source cards in the dashboard Feed Management modal (`frontend/src/app/page.tsx`).
- Updated unit test suite in `backend/tests/test_api.py` validating article count diagnostics (15/15 tests passing).
- Verified UI diagnostics with Playwright test (`verify_feed_source_diagnostics.py`).

## [0.6.7] - 2026-10-24
### Added
- Custom feed subscription endpoints (`POST /api/sources` and `DELETE /api/sources/{id}`) in `backend/main.py`.
- Dynamic Feed Sources & Subscriptions modal dialog in `frontend/src/app/page.tsx` with category type dropdown, subscription form, real-time channel counts, and unsubscribe actions.
- Local storage fallback for feed catalogue cache (`omnifeed_sources_cache`) during offline browsing.
- Unit test `test_custom_feed_subscription_lifecycle` in `backend/tests/test_api.py` (15/15 tests passing).
- Verified feed subscription workflow and modal UI via Playwright test (`verify_feed_subscription_modal.py`).

## [0.6.6] - 2026-10-24
### Added
- Offline topic detail caching in `frontend/src/app/page.tsx`: automatically saves fetched topic intelligence clusters, extracted entities, correlated articles, and narrative timelines into `localStorage` (`omnifeed_topic_detail_<id>`).
- Seamless offline modal viewing: clicking topic cluster cards while disconnected from the server falls back to locally cached cluster details with all narrative timelines and intelligence intact.
- Verified offline topic modal rendering using Playwright test suite (`verify_offline_topic_detail_modal.py`) and visual screenshot inspection.
- 14/14 backend unit/integration tests and automated offline access suite passing.

## [0.6.5] - 2026-10-24
### Added
- Breaking news controversy indicators ("🔥 BREAKING") on high-controversy and high-velocity topic clusters.
- Synthesized Web Audio API alert chime toggle ("🔔 Audio On" / "🔕 Audio") in dashboard header for instant auditory breaking alerts without external audio file dependencies.
- Backend `/api/topics` endpoint enhanced with `controversy_score`, `sentiment_score`, and `is_breaking` boolean flags.
- Verified breaking badges and audio toggle with Playwright test suite (`verify_breaking_alert_and_audio.py`).
- All 14 backend unit/integration tests passing.

## [0.6.4] - 2026-10-24
### Added
- Enhanced topic bookmark filtering with combined category tag selectors (All, General, Technology, Business, Politics, Science, Entertainment).
- Interactive amber highlighting for category filter pills when filtering saved reading list topics.
- Verified visual behavior and category empty states with Playwright test suite (`verify_bookmark_tag_filtering.py`).
- All 14 backend unit/integration tests passing.

## [0.6.3] - 2026-10-24
### Added
- Created dedicated end-to-end automated offline verification script (`scripts/test_offline_data_access.py`) simulating disconnected browser state, validating service worker caching, checking local topic persistence, and testing offline sync queue operations.
- Synchronized Tauri desktop configuration bundle version to v0.6.3 (`frontend/src-tauri/tauri.conf.json`).
- Verified 14/14 backend unit/integration tests and offline access suite execution.

## [0.6.2] - 2026-10-24
### Added
- Automated offline and PWA distribution build script (`scripts/build_offline_distribution.sh`) validating Web Manifest schemas, icons, Next.js build compilation, and service worker compliance.
- Added 192x192 and 512x512 maskable PWA icons to `frontend/public/` referenced in `manifest.json`.
- Comprehensive offline execution documentation in `DEPLOY.md` and `README.md` covering PWA caching, localStorage fallback, and offline sync queue mechanisms.
- Verified 14/14 backend unit/integration tests and production Next.js build pass.

## [0.6.1] - 2026-10-24
### Added
- Multi-runtime platform detection chip in navigation bar dynamically resolving `Desktop (Tauri)`, `PWA`, or `Web` based on browser capabilities and window bindings.
- Client-side persistent offline sync queue (`omnifeed_sync_queue`) stored in localStorage when disconnected from the backend.
- Dynamic "⚡ Queue Sync" action button with pulsing counter badge displaying pending synchronization operations while offline.
- Automated queue flush and ingestion execution upon network reconnection.
- Verified offline queuing, visual indicators, and headless interactions via Playwright test suite.
- All 14 backend unit and integration tests passing.

## [0.6.0] - 2026-10-24
### Added
- Resilient WebSocket streaming with exponential backoff automatic reconnection (1s scaling to 16s) in `frontend/src/app/page.tsx`.
- Connection lifecycle indicator badge with informative tooltip ("Live WS", "Reconnecting (attempt #)", or "Polling fallback").
- All 14 backend unit and integration tests passing.
- Verified visual connectivity indicators via automated Playwright test suite.

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
