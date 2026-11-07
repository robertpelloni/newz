# Omnifeed (Newz) Long-Term Architecture & Structural Roadmap

## Milestone 1: Zero-Dependency Core & High-Density UI (Completed - v0.2.0)
- [x] Dual-mode database layer (automatic SQLite local fallback + PostgreSQL production support).
- [x] Consolidated ultra-dense single-page dashboard architecture with category filtering and keyword search.
- [x] Multi-source ingestion pipeline: Google News, Yahoo News, Hacker News, Reddit JSON, MSN News.
- [x] Token-based Jaccard topic clustering and sentiment/controversy scoring engine.
- [x] Cross-platform system tray & server lifecycle manager CLI (`scripts/system_tray.py`).
- [x] Interactive deep-dive modal showing cross-source articles, social comments, and hashtag word clouds.
- [x] Comprehensive documentation overhaul (VISION, MEMORY, DEPLOY, IDEAS, CHANGELOG, ROADMAP, TODO, HANDOFF).

## Milestone 2: Intelligent Synthesis & Local LLM Integration (Completed - v0.3.0)
- [x] Topic evolution timeline tracking changes in story narratives over time.
- [x] Entity relationship extraction (people, organizations, locations).
- [x] Direct Ollama / llama.cpp bridge in `worker/tasks.py` for automated offline bulleted summaries.

## Milestone 3: Social Firehose & Real-Time Streaming (Completed - v0.4.0)
- [x] Bluesky AT Protocol Jetstream firehose listener for micro-commentary.
- [x] Mastodon public timeline streaming.
- [x] WebSocket server pushing live incoming news clusters directly to the frontend without polling.

## Milestone 4: Native Cross-Platform Distribution (Completed - v0.5.0)
- [x] Tauri v2 native desktop application wrapper embedding the Next.js bundle and Python backend.
- [x] Native system tray integration with OS notifications for breaking high-controversy topics.
- [x] Static export compilation pipeline (`frontend/out`) for offline-capable desktop shell.
- [x] Mobile-optimized PWA with offline caching (`manifest.json` and `sw.js`).
- [x] Dedicated offline API data caching with Network-First Cache-Fallback strategy and localStorage persistence (v0.5.7).
- [x] Client-side topic bookmarking and local storage persistence for offline reading (v0.5.8).
- [x] Curated Reading List export in Markdown and JSON for reporting and offline digests (v0.5.9).
- [x] Resilient live WebSocket auto-reconnect with exponential backoff and connection status telemetry (v0.6.0).
- [x] Multi-runtime platform detection and client-side offline sync queue with automatic replay on reconnect (v0.6.1).
- [x] Automated PWA offline distribution build pipeline and comprehensive offline documentation (v0.6.2).
- [x] End-to-end automated offline data access validation script and Tauri config synchronization (v0.6.3).
- [x] Multi-category tag filtering within saved offline reading list bookmarks (v0.6.4).
- [x] Breaking controversy indicators and synthesized Web Audio alert chimes (v0.6.5).
- [x] Offline topic detail caching and seamless cluster deep-dive inspection during disconnection (v0.6.6).
- [x] Dynamic custom RSS/Atom feed source subscription and registry management (v0.6.7).
- [x] Automated custom feed ingestion pipeline and per-source article productivity diagnostics (v0.6.8).
- [x] Real-time WebSocket streaming optimization with delta payload streaming and instant live state merging (v0.6.9).
- [x] Service Worker Background Sync (`sync-omnifeed-queue`) and PWA distribution build finalization (v0.7.0).
- [x] Feed source health diagnostics and real-time endpoint latency probing (v0.7.1).
- [x] Unified PWA and Tauri desktop offline bundle validation (v0.7.2).
- [x] IndexedDB Intelligence Vault (`omnifeed_offline_db`) and Offline Storage Governance Modal (v0.7.3).
- [x] Data flow architecture specification and multi-source pipeline design.
- [x] Deep architectural component specifications (Ingestion, Enrichment Pipeline, Consolidated Presentation Layer).
