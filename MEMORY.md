# MEMORY

Ongoing internal architectural observations, codebase traits, and design preferences.

- We are building "Omnifeed", a high-performance news and social sentiment aggregator.
- Tech Stack: Python (FastAPI), PostgreSQL (pgvector), Redis, Next.js (React), Tailwind CSS, Celery/Arq.
- Layout: Monorepo with `/backend`, `/worker`, and `/frontend` directories.
- Currently, local dev is done using docker-compose for PostgreSQL and Redis, and python virtualenvs/pip for backend/worker dependencies.
