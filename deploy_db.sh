#!/bin/bash
echo "Note: Docker containers cannot be natively spun up in this sandbox environment. Run \`docker compose up -d\` on the host to start PostgreSQL and Redis."
cd backend
# Explicitly set the connection URL so Alembic uses Postgres, not the sqlite fallback
export DATABASE_URL="postgresql://user:password@localhost/omnifeed"
PYTHONPATH=.. alembic upgrade head
echo "Done."
