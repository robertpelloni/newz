# newz (Omnifeed)

**Multi-source news and sentiment aggregator** — "Google News on steroids": correlate the same story across Google News, Yahoo News, MSN, and Fox; merge in link-aggregator signals (Reddit, Hacker News, Lobsters, Digg, …) matched to those topics; read the articles *and* the comment threads; summarize both with highlights, topics, and sentiment; then layer social-media reaction (Bluesky AT Protocol, Mastodon Fediverse, X/Twitter, Threads, LinkedIn, Facebook, 4chan) on top, presented as a high-density, topic-clustered news front page and unified dashboard.

---

## 1. Data Flow Architecture & System Diagram

The Omnifeed data processing pipeline operates as a real-time reactive ingestion and synthesis loop connecting heterogeneous raw feeds to an ultra-dense intelligence frontend.

```
+----------------------------------------------------------------------------------------------------+
|                                    1. RAW INGESTION SOURCES                                        |
|                                                                                                    |
|  [Mainstream Wires]       [Link Aggregators]         [Social Firehoses]         [Community Boards] |
|   - Google News RSS        - Reddit (r/news, tech)    - Bluesky AT Protocol      - Hacker News API |
|   - Yahoo News RSS         - Lobsters JSON            - Mastodon Fediverse       - 4chan JSON      |
|   - MSN / Fox Wires        - Digg Submissions         - Threads / X firehose                       |
+----------------------------------------+-----------------------------------------------------------+
                                         |
                                         v
+----------------------------------------------------------------------------------------------------+
|                               2. NORMALIZATION & TOKEN PRE-PROCESSING                              |
|                                                                                                    |
|   - Text Sanitation & HTML Strip       - Token Regex Extraction ([a-zA-Z]{3,})                     |
|   - Stop-Word Filtering (50+ words)    - Deduplication by Normalized URL / Headline Hash           |
+----------------------------------------+-----------------------------------------------------------+
                                         |
                                         v
+----------------------------------------------------------------------------------------------------+
|                            3. CLUSTERING & INTELLIGENCE PIPELINE                                   |
|                                                                                                    |
|   - Unsupervised Jaccard Similarity (Threshold >= 0.25 token intersection/union)                   |
|   - Entity Extraction (Capitalized proper noun n-gram candidate ranking)                           |
|   - Chronological Narrative Evolution Tracking (Timestamped wire milestones)                       |
|   - Lexicon Sentiment & Controversy Engine (Positive/Negative polarities + overlap scoring)        |
|   - Local LLM / Ollama Synthesis (Llama3 prompt bridge + heuristic fallback)                       |
+----------------------------------------+-----------------------------------------------------------+
                                         |
                                         v
+----------------------------------------------------------------------------------------------------+
|                                4. PERSISTENCE & STORAGE TIER                                       |
|                                                                                                    |
|   - Dual-Engine Architecture:                                                                      |
|     * Local Zero-Dependency Fallback: SQLite (`sqlite:///./omnifeed.db`)                           |
|     * Production Distributed: PostgreSQL + pgvector (`DATABASE_URL`)                               |
|   - Relational Models: Source, Article, Topic, ArticleTopic, Sentiment, Discussion                 |
+-------------------+---------------------------------------------------+----------------------------+
                    |                                                   |
                    v (REST APIs)                                       v (Duplex WebSockets)
+---------------------------------------+   +--------------------------------------------------------+
|       5. FASTAPI APPLICATION HUB      |   |             6. REAL-TIME EVENT STREAMING               |
|                                       |   |                                                        |
|   - GET  /api/topics (Pagination)     |   |   - WS /api/ws/feed                                    |
|   - GET  /api/topics/{id} (Timeline)  |   |   - ConnectionManager Broadcasting:                    |
|   - POST /api/topics/{id}/summarize   |   |     * sync_completed (Wire updates)                    |
|   - POST /api/firehose/simulate       |   |     * firehose_pulse (Social micro-commentary)         |
|   - GET  /api/sentiment/pulse         |   |                                                        |
|   - GET  /api/topics/export (CSV/JSON)|   |                                                        |
+-------------------+-------------------+   +---------------------------+----------------------------+
                    |                                                   |
                    +-------------------+-------------------------------+
                                        |
                                        v
+----------------------------------------------------------------------------------------------------+
|                           7. CONSOLIDATED INTELLIGENCE FRONTEND                                    |
|                                                                                                    |
|   - Next.js 15 & Tailwind CSS v4 Single-Page Operations Dashboard                                  |
|   - Top Telemetry Bar (Total Articles, Active Topics, Discussions, Global Polarity Pulse)          |
|   - Real-Time Search & Categorical Filtering (General, Tech, Business, Politics, Science, Entert.) |
|   - Dual-Direction Server Pagination (Top & Bottom pagination controls)                            |
|   - Interactive Topic Cluster Deep-Dive Modal:                                                     |
|     * Correlated multi-source wire headlines & external links                                      |
|     * Extracted named entity badges                                                                |
|     * Chronological narrative evolution timeline nodes                                             |
|     * Synthesized intelligence summary card with local LLM refresh button                          |
|   - Operational Controls: Stream Firehose, Sync Ingestion, Export CSV/JSON, OLED Contrast, Shutdown|
|   - Cross-Platform Distribution:                                                                   |
|     * Desktop Shell: Tauri v2 Wrapper (`frontend/src-tauri`)                                       |
|     * PWA: Offline service worker caching (`sw.js`) & Web App Manifest (`manifest.json`)           |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Components

Omnifeed's architectural foundation is partitioned into three foundational subsystems:

### Component 1: Multi-Source Data Ingestion Engine
- **Mainstream Wires**: High-frequency XML/RSS pollers for Google News, Yahoo News, and MSN News, extracting structured headlines, links, publication timestamps, and snippet contents.
- **Link Aggregators**: Automated JSON parsers for Reddit (`/r/news`, `/r/technology`), Hacker News Firebase API, and Lobsters capturing submissions, vote velocities, author metadata, and discussion threads.
- **Real-Time Social Firehoses**: Subscribers for the Bluesky AT Protocol Jetstream and Mastodon Fediverse public timelines (`/api/firehose/simulate`), capturing instant micro-reactions and breaking bulletins.
- **Sanitization & Token Pre-Processing**: HTML stripping, lowercase regex normalization (`[a-zA-Z]{3,}`), and 50+ stop-word elimination to yield informative semantic token sets.

### Component 2: Processing & Enrichment Pipeline
- **Unsupervised Topic Clustering**: Token-based Jaccard similarity engine:
  $$\text{Jaccard}(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
  Incoming articles with a similarity score $sim \ge 0.25$ automatically cluster into existing topic entities; otherwise, a new dynamic topic cluster is spawned.
- **Entity Extraction**: Unsupervised proper-noun n-gram parser that extracts high-frequency named entities (persons, organizations, locations) across cluster documents.
- **Chronological Narrative Evolution**: Each correlated wire or social article generates an event marker containing `headline`, `source`, `source_type`, `polarity`, `url`, and timezone-aware UTC timestamps, sorted in strict chronological sequence.
- **Lexicon Polarity & Controversy Scoring**: Keyword polarity evaluation coupled with controversy metrics when competing positive/negative signals coincide.
- **Local LLM Synthesis Bridge**: Integration with local Ollama instances (`llama3`) for on-demand 3-bullet executive synthesis, backed by deterministic multi-source heuristic fallback.

### Component 3: Consolidated Presentation Layer
- **Unified Single-Screen Operations Hub**: High-density Next.js 15 and Tailwind CSS v4 dashboard consolidating all features without fragmentation.
- **Duplex WebSocket Event Streaming**: `/api/ws/feed` channel pushing live ingestion notifications and firehose bursts directly to client UI toast alerts.
- **Topic Deep-Dive Modal**: Interactive inspector displaying correlated source links, entity tags, chronological timeline nodes, and local AI synthesis summaries.
- **Dual Persistence Architecture**: Zero-dependency automatic SQLite fallback (`sqlite:///./omnifeed.db`) for immediate standalone developer use, with full PostgreSQL + pgvector support for production scale.
- **Cross-Platform Delivery**: Tauri v2 native desktop application wrapper (`frontend/src-tauri/`) and Progressive Web App with offline caching (`sw.js` and `manifest.json`).

---

## 3. Project Structure
- `/backend`: FastAPI REST API, WebSocket streaming channel, SQLAlchemy ORM models, and database engine with SQLite fallback.
- `/worker`: Tasks for feed ingestion, unsupervised clustering, sentiment scoring, and local LLM summarization.
- `/frontend`: Next.js 15 React web dashboard with Tailwind CSS v4, PWA service worker, and Tauri v2 desktop integration (`frontend/src-tauri`).
- `/scripts`: Standalone lifecycle controller and system tray daemon (`scripts/system_tray.py`).
