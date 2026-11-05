# Session Handoff & Continuity Notes

## 1. What Was Learned & Discovered
- **Upstream Scaffolding**: An unmerged upstream branch `origin/omnifeed-scaffolding-v1-12010847412342953271` contained the base project skeleton. Merging required `--allow-unrelated-histories` and fixing an import error (`Source` model not imported into `backend/models.py`).
- **Postgres Dependency Decoupling**: Without local Postgres/Redis, the backend previously crashed on boot. Adding a graceful SQLite fallback (`sqlite:///./omnifeed.db`) in `backend/database.py` allows full out-of-the-box local operation while maintaining full PostgreSQL compatibility in production.
- **Frontend Build & Styling**: Next.js 15 with Tailwind CSS v4 required `@tailwindcss/postcss` and a proper `postcss.config.mjs` file to render styles accurately.
- **Consolidation**: The dashboard was consolidated into a single-page ultra-dense intelligence dashboard (`frontend/src/app/page.tsx`) with category filters, real-time search, global sentiment indicators, source health badges, and modal topic deep-dives.
- **System Tray**: `scripts/system_tray.py` allows command-line and tray-based service status queries, sync triggering, browser launching, and graceful shutdown.
- **Milestone 2 & 3 Completion**:
  - Unsupervised entity parsing and cross-source chronological narrative timeline markers persisted to `Topic` models.
  - Real-time social firehose streaming (`/api/firehose/simulate`) for Bluesky AT Protocol Jetstream and Mastodon Fediverse timelines.
  - Local LLM / Ollama bulleted summary generation bridge (`generate_ai_summary`) and `/api/topics/{id}/summarize` endpoint.
  - Frontend operational dashboard with real-time WebSocket toast alerts, firehose streaming triggers, OLED contrast toggling, CSV/JSON topic exports, and deep-dive modal with AI synthesis refresh buttons.
- **Milestone 4 Completion**:
  - Configured Tauri v2 native desktop application wrapper in `frontend/src-tauri/` (`Cargo.toml`, `tauri.conf.json`, `src/main.rs`).
  - Next.js static export pipeline (`output: 'export'`) configured in `frontend/next.config.ts` delivering production assets to `frontend/out`.
  - Added desktop lifecycle npm scripts (`tauri:dev`, `tauri:build`) in `frontend/package.json`.
  - PWA offline caching service worker implemented in `frontend/public/sw.js` and registered in `frontend/src/app/page.tsx` with `manifest.json`.

## 2. Current State of Running Processes
- Backend: Uvicorn running on `0.0.0.0:8000` (live, passing all 13 automated API & model tests).
- Frontend: Next.js static production bundle exported to `frontend/out/` and server verified on `0.0.0.0:3000`.
- SQLite Database: `omnifeed.db` populated with real-time news clusters, social sentiment records, entity extractions, and timeline events.

## 3. Resume Instructions for Next Session
- To run tests: `/home/jules/.pyenv/shims/python3 -m pytest backend/tests/ -v`
- To run worker sync: `python3 scripts/system_tray.py --sync`
- To stream firehose: `curl -X POST http://localhost:8000/api/firehose/simulate`
- To build static frontend export: `npm --prefix frontend run build`
- To build desktop binary: `npm --prefix frontend run tauri:build`
- To inspect UI: Visit `http://localhost:3000`
- To stop all servers cleanly: `python3 scripts/system_tray.py --stop`
