# Session Handoff & Continuity Notes

## 1. What Was Learned & Discovered
- **Upstream Scaffolding**: An unmerged upstream branch `origin/omnifeed-scaffolding-v1-12010847412342953271` contained the base project skeleton. Merging required `--allow-unrelated-histories` and fixing an import error (`Source` model not imported into `backend/models.py`).
- **Postgres Dependency Decoupling**: Without local Postgres/Redis, the backend previously crashed on boot. Adding a graceful SQLite fallback (`sqlite:///./omnifeed.db`) in `backend/database.py` allows full out-of-the-box local operation while maintaining full PostgreSQL compatibility in production.
- **Frontend Build & Styling**: Next.js 15 with Tailwind CSS v4 required `@tailwindcss/postcss` and a proper `postcss.config.mjs` file to render styles accurately.
- **Consolidation**: The dashboard was consolidated into a single-page ultra-dense intelligence dashboard (`frontend/src/app/page.tsx`) with category filters, real-time search, global sentiment indicators, source health badges, and modal topic deep-dives.
- **System Tray**: `scripts/system_tray.py` allows command-line and tray-based service status queries, sync triggering, browser launching, and graceful shutdown.
- **Milestone 2 Narrative Evolution & Entity Extraction**: Successfully added unsupervised entity parsing and cross-source chronological timeline event sequencing to `worker/tasks.py` and `backend/models.py`. The deep-dive modal in the frontend exposes extracted key entities as badge chips and visual milestone nodes with wire badges and formatted timestamps.

## 2. Current State of Running Processes
- Backend: Uvicorn running on `0.0.0.0:8000` (live, passing 11 automated API & model tests).
- Frontend: Next.js running on `0.0.0.0:3000` (verified via Playwright headless browser screenshots).
- SQLite Database: `omnifeed.db` populated with real-time news clusters, social sentiment records, entity extractions, and timeline events.

## 3. Resume Instructions for Next Session
- To run tests: `/home/jules/.pyenv/shims/python3 -m pytest backend/tests/ -v`
- To run worker sync: `python3 scripts/system_tray.py --sync`
- To build frontend: `npm --prefix frontend run build`
- To inspect UI: Visit `http://localhost:3000`
- To stop all servers cleanly: `python3 scripts/system_tray.py --stop`
