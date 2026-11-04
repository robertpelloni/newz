# Session Handoff & Continuity Notes

## 1. What Was Learned & Discovered
- **Upstream Scaffolding**: An unmerged upstream branch `origin/omnifeed-scaffolding-v1-12010847412342953271` contained the base project skeleton. Merging required `--allow-unrelated-histories` and fixing an import error (`Source` model not imported into `backend/models.py`).
- **Postgres Dependency Decoupling**: Without local Postgres/Redis, the backend previously crashed on boot. Adding a graceful SQLite fallback (`sqlite:///./omnifeed.db`) in `backend/database.py` allows full out-of-the-box local operation while maintaining full PostgreSQL compatibility in production.
- **Frontend Build & Styling**: Next.js 15 with Tailwind CSS v4 required `@tailwindcss/postcss` and a proper `postcss.config.mjs` file to render styles accurately.
- **Consolidation**: The dashboard was consolidated into a single-page ultra-dense intelligence dashboard (`frontend/src/app/page.tsx`) with category filters, real-time search, global sentiment indicators, source health badges, and modal topic deep-dives.
- **System Tray**: `scripts/system_tray.py` allows command-line and tray-based service status queries, sync triggering, browser launching, and graceful shutdown.

## 2. Current State of Running Processes
- Backend: Uvicorn running on `0.0.0.0:8000`.
- Frontend: Next.js running on `0.0.0.0:3000`.
- SQLite Database: Populated with real-time news clusters and social sentiment records.

## 3. Resume Instructions for Next Session
- To run tests: `pytest backend/tests/`
- To run worker sync: `python scripts/system_tray.py --sync`
- To inspect UI: Visit `http://localhost:3000`
- To stop all servers cleanly: `python scripts/system_tray.py --stop`
