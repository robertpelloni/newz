# CHANGELOG

Document every adjustment. Track a single, global version string/date/build number sourced from `VERSION.md`.

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
