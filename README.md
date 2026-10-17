# newz

please create detailed instructions to create a robust news aggregator that correlates news stories from multiple sources from google news yahoo news msn fox, combining stories into topics and collecting links, then also scraping all link aggregators like reddit, digg, stumbleupon, lenny, hacke rnews, lobsters, etc and correlating the links with the news topics, then getting the comments and reading those, and reading the articles, then summarizing both and noting highlights and sentiment and comment topics, and then also searching social media twitter, threads, linkedin, mastodon, facebook, 4chan, and getting sentiment and topics from there, and presenting them in style like google news on steroids, and detailed rules to give to google jules to automatically build it 

Here is a comprehensive architecture and execution blueprint for building your high-performance, multi-source news and social sentiment aggregator—styled like Google News on steroids—alongside a precise, production-ready specification packet designed to feed straight into Google Jules to execute asynchronously.

Architecture Overview: "The Omnifeed Engine"
Ingestion & Normalization Layer (Scrapers/APIs):

Mainstream News: RSS/Atom feeds and custom scrapers for Google News, Yahoo News, MSN, and Fox News.

Link Aggregators: Automated parsers for Reddit, Digg (legacy/revival tracks), StumbleUpon successors/alternatives, Lenny, Hacker News, Lobsters, etc.

Social Sentiment Hub: Ingestion pipeline for Twitter/X, Threads, LinkedIn, Mastodon, Facebook public groups/pages, and 4chan boards.

Core Processing & Enrichment Engine:

Semantic Topic Clustering: Vector embeddings (using models like text-embedding-3 or local open-source transformers) mapped via HDBSCAN/Cosine Similarity to fuse multi-source mainstream articles and social shares into single "Dynamic Topics".

Scraper & Content Extractor: Headless browser rendering (Playwright/Puppeteer) to extract full article text, comment trees, and discussion transcripts.

AI Summarization & Sentiment Pipeline: Utilizing LLMs to extract:

Executive Summary (Bullet points + TL;DR).

Key Highlights / Facts.

Sentiment breakdown (Positive, Negative, Neutral, Outrage/Sarcasm index).

Comment Discourse Themes (What users are actually arguing about or noting).

Frontend Presentation Layer ("Google News on Steroids"):

A multi-column, modular dashboard featuring live topic cards, sentiment meters, source diversity scores, cross-platform conversation threads, and real-time updating feeds.

Detailed Prompt Instructions for Google Jules
Copy and paste the instructions below into Jules to spin up the cloud VM, plan out the repository structure, write the code, test it, and open a complete GitHub Pull Request.

Markdown
# TASK SPECIFICATION FOR GOOGLE JULES: Build "Omnifeed" - Advanced News & Social Sentiment Aggregator

## Objective
Create a full-stack, modular, automated news aggregation and social sentiment correlation engine. The application must ingest mainstream news, link aggregators, and social networks, cluster them into unified topics using vector embeddings, analyze sentiment and comment discussions via AI, and present them in a high-density, lightning-fast web dashboard styled like "Google News on steroids."

## Tech Stack Requirements
- **Backend:** Python (FastAPI) for high-performance async processing and API routing.
- **Database & Vector Store:** PostgreSQL with `pgvector` for storing articles, comments, topics, and vector embeddings. Redis for caching and Celery/Task queues for background ingestion workers.
- **Scraping & Ingestion:** `feedparser` for RSS, `playwright` or `httpx` for web scraping, and official APIs where available.
- **AI / NLP Processing:** OpenAI API / compatible local endpoints (or LangChain/LlamaIndex architecture) for clustering, summarization, sentiment scoring, and highlight extraction.
- **Frontend:** Next.js (React) with Tailwind CSS and a high-density layout dashboard (masonry/multi-column grid, real-time filters, sentiment gauges, and live comment topic clouds).

---

## Step-by-Step Implementation Instructions

### Step 1: Project Scaffolding & Database Schema
1. Initialize a monorepo structure with `/backend`, `/worker`, and `/frontend`.
2. Write a SQLAlchemy / Alembic database schema including tables for:
   - `sources` (id, name, type [mainstream, aggregator, social], url)
   - `articles` (id, source_id, title, url, raw_content, published_at, author)
   - `topics` (id, title, summary, category, embedding vector, first_seen, last_updated)
   - `article_topics` (foreign key mapping articles to aggregated topics)
   - `discussions` (id, topic_id, platform [reddit, hackernews, twitter, etc.], raw_comments_text, sentiment_score, comment_topics)
   - `sentiments` (id, topic_id, overall_score, breakdown_json)

### Step 2: Multi-Source Ingestion Pipeline (The Scrapers)
Build robust, error-tolerant async background workers (`celery` or `arq`) to fetch data every 15 minutes:
1. **Mainstream News Inservers:** Fetch RSS/Atom and parse updates from Google News, Yahoo News, MSN, and Fox News.
2. **Link Aggregators:** Scrape or pull APIs from Reddit, Hacker News, Lobsters, Lenny, and legacy/alternative aggregator feeds.
3. **Social Media Trackers:** Ingest public feeds/search parameters from Twitter/X, Threads, LinkedIn, Mastodon, Facebook, and 4chan. Implement rate-limiting protection, rotating user-agents, and proxy support.

### Step 3: Content Extraction, Clustering & AI Processing
1. **Full-Text & Comment Extraction:** Use a headless browser service to scrape full article bodies and scrape deep comment threads from Reddit, Hacker News, and social posts.
2. **Semantic Clustering Engine:** 
   - Generate embeddings for incoming article titles and descriptions.
   - Run a clustering algorithm (e.g., cosine similarity thresholding or HDBSCAN) to group related items across Google News, Yahoo, MSN, and Fox into a single `Topic`.
3. **AI Summarization & Sentiment Engine:** For each clustered topic:
   - Generate a concise synthesis summarizing *what* happened across sources.
   - Extract key highlights, bullet points, and timeline facts.
   - Read and synthesize user comment threads to map out *what the public thinks* (sentiment score from -1 to 1, common talking points, controversy flags).

### Step 4: Backend API Endpoints (FastAPI)
Create clean REST and WebSocket endpoints:
- `GET /api/topics`: Paginated list of active topics sorted by velocity, importance, or controversy, with filtering by category or source.
- `GET /api/topics/{id}`: Deep dive payload including mainstream links, aggregator discussions, comment sentiment breakdowns, and timeline highlights.
- `GET /api/sentiment/global`: Real-time sentiment trends across social feeds.

### Step 5: Frontend Dashboard ("Google News on Steroids")
Build a modern, dense, lightning-fast Next.js dashboard UI:
- **Layout:** Multi-column layout featuring a main breaking news grid, a "Side-by-Side Media Bias/Source View" panel, and a live social sentiment ticker.
- **Topic Cards:** Each card displays the unified headline, source count badges (e.g., "Covered by Google, Fox, Yahoo + 12 Reddit threads"), sentiment color codes, and a quick-expand drawer.
- **Deep-Dive Modal:** Clicking a topic opens a comprehensive breakdown screen showing the synthesized summary, bulleted highlights, a breakdown of what Hacker News vs. Twitter vs. Mainstream media are saying, and a comment topic cloud.

### Step 6: Testing & Quality Assurance
1. Write unit tests for the clustering engine and database models using `pytest`.
2. Ensure graceful handling of broken links, rate limits, and missing fields during scraping.
3. Verify that the Docker Compose setup (`docker-compose.yml`) brings up PostgreSQL, Redis, Fas
