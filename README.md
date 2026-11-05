# newz

**Multi-source news and sentiment aggregator** — "Google News on steroids": correlate the same story across Google News, Yahoo News, MSN, and Fox; merge in link-aggregator signals (Reddit, Hacker News, Lobsters, Digg, …) matched to those topics; read the articles *and* the comment threads; summarize both with highlights, topics, and sentiment; then layer social-media reaction (X/Twitter, Threads, LinkedIn, Mastodon, Facebook, 4chan) on top, presented as a high-density, topic-clustered news front page and unified dashboard.

## Architecture Overview: "The Omnifeed Engine"

1. **Ingestion & Normalization Layer (Scrapers/APIs):**
   - **Mainstream News:** RSS/Atom feeds and scrapers for Google News, Yahoo News, MSN, and Fox News.
   - **Link Aggregators:** Automated parsers for Reddit, Digg, Hacker News, Lobsters, etc.
   - **Social Sentiment Hub:** Ingestion pipeline for Twitter/X, Threads, LinkedIn, Mastodon, Facebook, and 4chan boards.

2. **Core Processing & Enrichment Engine:**
   - **Semantic Topic Clustering:** Embeddings and similarity clustering to fuse multi-source mainstream articles and social shares into single "Dynamic Topics".
   - **Scraper & Content Extractor:** Playwright / HTTP extractors for full article text, comment trees, and discussion transcripts.
   - **AI Summarization & Sentiment Pipeline:** LLM / NLP synthesis extracting executive summaries, key highlights, sentiment breakdown, and discourse themes.

3. **Frontend Presentation Layer ("Google News on Steroids"):**
   - Unified dense dashboard featuring live topic cards, sentiment meters, media bias/diversity scores, cross-platform conversation threads, system controls, and real-time updating feeds.

## Project Structure
- `/backend`: FastAPI REST API, database schemas, and models.
- `/worker`: Celery / async tasks for background feed ingestion, clustering, and AI analysis.
- `/frontend`: Next.js React web dashboard with Tailwind CSS.
