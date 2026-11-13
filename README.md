# newz (Omnifeed)

A multi-source news and sentiment aggregator: correlate the same story across Google News, Yahoo News, MSN, and Fox; merge in link-aggregator signals (Reddit, Hacker News, Lobsters, Digg) matched to those topics; read the articles and the comment threads; summarize both with highlights, topics, and sentiment; then layer social-media reaction (Bluesky AT Protocol, Mastodon, X/Twitter, Threads, LinkedIn, Facebook, 4chan) on top, presented as a high-density, topic-clustered news front page and unified dashboard.

## Status

**Active development (v1.0.4).** Last significant activity: **2026-11-12** — merge of the omnifeed unified-dashboard branch (Protocol #281). Nov 8–11 shipped v1.0.0–v1.0.4: offline sync audit logging, conflict-resilient queue reconciliation, Web Audio alert tones, delta sync deep-story ingestion and caching, and an orchestrated sync pipeline.

The Nov 8 commit calls v1.0.0 "Production General Availability" — that is the commit's label, not an independently verified deployment. There is no evidence in the repo of a live public deployment.

## Architecture

- **Ingestion** — RSS pollers for mainstream wires (Google News, Yahoo News, MSN, Fox); JSON parsers for link aggregators (Reddit, Hacker News, Lobsters, Digg, 4chan); social firehoses (Bluesky AT Protocol, Mastodon, Threads/X)
- **Normalization & clustering** — text sanitation, stop-word filtering, dedup by normalized URL/headline hash, Jaccard-similarity topic clustering (threshold ≥ 0.25), entity extraction, lexicon sentiment/controversy scoring, local LLM (Ollama/Llama3) synthesis with heuristic fallback
- **Persistence** — SQLite locally (`omnifeed.db`); PostgreSQL + pgvector for production (`DATABASE_URL`). Models: Source, Article, Topic, ArticleTopic, Sentiment, Discussion
- **Backend** (`backend/`) — FastAPI: REST endpoints for topics, timelines, summaries, sentiment pulse, CSV/JSON export; WebSocket feed (`/api/ws/feed`) for live updates
- **Worker** (`worker/`) — ingestion/sync jobs
- **Frontend** (`frontend/`) — Next.js 15 + Tailwind CSS v4 single-page dashboard: telemetry bar, search and category filtering, topic-cluster deep-dive modals, firehose/sync/export controls; Tauri v2 desktop wrapper and PWA offline caching

## Running

```bash
docker-compose up   # see docker-compose.yml and DEPLOY.md
```

See `DEPLOY.md` for deployment notes and `HANDOFF.md` for the current state of the work.
