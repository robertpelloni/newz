# CHANGELOG

Document every adjustment. Track a single, global version string/date/build number sourced from `VERSION.md`.

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
