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
- [x] Data flow architecture specification and multi-source pipeline design.
- [x] Deep architectural component specifications (Ingestion, Enrichment Pipeline, Consolidated Presentation Layer).
