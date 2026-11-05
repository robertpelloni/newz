# newz (Omnifeed)

**Multi-source news and sentiment aggregator** — "Google News on steroids": correlate the same story across Google News, Yahoo News, MSN, and Fox; merge in link-aggregator signals (Reddit, Hacker News, Lobsters, Digg, …) matched to those topics; read the articles *and* the comment threads; summarize both with highlights, topics, and sentiment; then layer social-media reaction (Bluesky AT Protocol, Mastodon Fediverse, X/Twitter, Threads, LinkedIn, Facebook, 4chan) on top, presented as a high-density, topic-clustered news front page and unified dashboard.

---

## 1. Data Flow & Architecture Specification

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

## 2. Ingestion & Normalization Mechanics

### Multi-Source Feeds
- **Mainstream Wires**: Parsed from XML/RSS structures (`Google News`, `Yahoo News`, `MSN News`). Items include title, publication date, URL, and summary descriptions.
- **Link Aggregators**: Public JSON endpoints from `Reddit` (e.g., `/r/news`, `/r/technology`) capturing submission titles, authors, comment counts, and direct community commentary bodies.
- **Social Firehoses**: Simulated real-time micro-commentary streams from the `Bluesky AT Protocol Jetstream` and `Mastodon Fediverse` public firehoses, capturing fast-moving developments and distributed social reactions.

### Topic Clustering & Narrative Evolution
- **Similarity Scoring**: Token sets are extracted using regular expressions, stripped of stop words, and compared against active topic clusters using Jaccard similarity:
  $$\text{Jaccard}(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
  Matches exceeding the threshold ($0.25$) are bound to existing topic clusters; unmatched stories spawn new dynamic topics.
- **Narrative Timeline**: As subsequent stories cluster into a topic, chronological milestone records (`headline`, `source`, `timestamp`, `url`) are appended to `timeline_json`, forming a historical progression of the story.
- **Named Entity Extraction**: Capitalized multi-word noun candidates are parsed and frequency-ranked, exposing people, organizations, and places as badges in the cluster view.

---

## 3. Project Structure
- `/backend`: FastAPI REST API, WebSocket streaming channel, SQLAlchemy ORM models, and database engine with SQLite fallback.
- `/worker`: Tasks for feed ingestion, unsupervised clustering, sentiment scoring, and local LLM summarization.
- `/frontend`: Next.js 15 React web dashboard with Tailwind CSS v4, PWA service worker, and Tauri v2 desktop integration (`frontend/src-tauri`).
- `/scripts`: Standalone lifecycle controller and system tray daemon (`scripts/system_tray.py`).
