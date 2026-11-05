# MEMORY: Architectural Observations & Design Traits

## 1. Storage & Decoupling
- **Zero-Dependency Fallback**: `backend/database.py` seamlessly falls back to `sqlite:///./omnifeed.db` if PostgreSQL / Redis are unreachable, ensuring frictionless standalone execution.
- **Relational Schema**: `Topic`, `Article`, `ArticleTopic`, `Sentiment`, `Discussion`, and `Source` tables capture cross-referenced topic graphs and social discourse.

## 2. Ingestion & NLP Synthesis
- **Clustering**: Token-based Jaccard similarity ($sim \ge 0.25$) clusters related headlines and descriptions without requiring external cloud embeddings.
- **Entity Extraction**: Capitalized multi-word regex parsing extracts high-confidence named entities (people, organizations, places).
- **Timeline Milestones**: Every correlated article appends a timestamped wire record to `timeline_json`.
- **Local LLM Integration**: `worker/tasks.py` queries `OLLAMA_URL` (`http://localhost:11434/api/generate`) with graceful fallback to deterministic multi-source bullet synthesis.

## 3. Real-Time Streaming & UX
- **WebSocket Streaming**: Duplex WebSocket route `/api/ws/feed` broadcasts `sync_completed` and `firehose_pulse` events.
- **Unified Frontend**: Next.js 15 + Tailwind CSS v4 in `frontend/src/app/page.tsx` consolidates all navigation, search, filters, pagination, and modal deep-dives onto a single screen.
- **PWA & Desktop**: Service worker (`frontend/public/sw.js`) and Tauri v2 desktop scaffolding (`frontend/src-tauri/`) provide offline caching and native app builds.
