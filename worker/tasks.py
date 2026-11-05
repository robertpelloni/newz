import os
import requests
import json
import xml.etree.ElementTree as ET
import datetime
import re
from collections import Counter
try:
    from backend.database import SessionLocal
    from backend import models
except ImportError:
    from database import SessionLocal
    import models

# Common stop words for topic clustering
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
    "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
    "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "says",
    "new", "update", "first", "live", "report", "breaking"
}

def clean_tokens(text: str):
    """Normalize text into informative lowercase keyword set."""
    words = re.findall(r'[a-zA-Z]{3,}', text.lower())
    return set(w for w in words if w not in STOP_WORDS)

def calculate_jaccard(tokens1, tokens2):
    """Measure overlap similarity between two token sets."""
    if not tokens1 or not tokens2:
        return 0.0
    intersection = len(tokens1.intersection(tokens2))
    union = len(tokens1.union(tokens2))
    return float(intersection) / union if union > 0 else 0.0

def extract_named_entities(text: str):
    """Extract capitalized multi-word phrases and key proper nouns as entities."""
    # Find consecutive capitalized words (e.g. 'Donald Trump', 'Supreme Court', 'Silicon Valley')
    pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
    candidates = re.findall(pattern, text)
    filtered = []
    for c in candidates:
        words = c.lower().split()
        if len(c) > 2 and not all(w in STOP_WORDS for w in words):
            filtered.append(c)
    # Deduplicate while preserving frequent appearances
    counts = Counter(filtered)
    return [name for name, _ in counts.most_common(8)]

def simple_sentiment_analysis(text: str):
    """Rule-based polarity and controversy scoring."""
    positive_words = {"surges", "breakthrough", "gain", "peace", "record", "growth", "win", "wins", "celebrates", "success", "innovative", "historic", "agreement", "hope", "leads", "boost", "optimism"}
    negative_words = {"crash", "death", "war", "crisis", "disaster", "kills", "lawsuit", "arrested", "plunge", "collapse", "charges", "warning", "attack", "conflict", "drops", "slumps", "threat", "fails"}

    tokens = clean_tokens(text)
    pos_count = len(tokens.intersection(positive_words))
    neg_count = len(tokens.intersection(negative_words))

    score = 0.0
    if pos_count > neg_count:
        score = min(0.9, 0.25 * (pos_count - neg_count))
    elif neg_count > pos_count:
        score = max(-0.9, -0.25 * (neg_count - pos_count))

    # Controversy occurs when both polarities exist
    controversy = min(1.0, (pos_count * neg_count) / 2.0) if (pos_count > 0 and neg_count > 0) else 0.0
    return score, controversy

def fetch_rss_feed(url: str, limit: int = 15):
    """Parse RSS feed XML into uniform article dictionaries."""
    articles = []
    try:
        resp = requests.get(url, headers={"User-Agent": "Omnifeed-Engine/0.2.0"}, timeout=10)
        if resp.status_code == 200:
            root = ET.fromstring(resp.content)
            for item in root.findall(".//item")[:limit]:
                title = item.findtext("title") or "Untitled"
                link = item.findtext("link") or ""
                description = item.findtext("description") or ""
                pubDate = item.findtext("pubDate") or ""
                articles.append({
                    "title": title.strip(),
                    "url": link.strip(),
                    "content": description.strip(),
                    "published_at": datetime.datetime.utcnow(),
                    "author": "News Wire"
                })
    except Exception as e:
        print(f"Error fetching RSS feed {url}: {e}")
    return articles

def fetch_reddit_posts(subreddit: str = "news", limit: int = 15):
    """Fetch recent submissions from Reddit public JSON."""
    posts = []
    try:
        url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Omnifeed Aggregator)"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for child in data.get("data", {}).get("children", []):
                pdata = child.get("data", {})
                title = pdata.get("title", "")
                link = pdata.get("url", "")
                author = pdata.get("author", "reddit_user")
                posts.append({
                    "title": title.strip(),
                    "url": link.strip(),
                    "content": pdata.get("selftext", "") or title,
                    "published_at": datetime.datetime.utcnow(),
                    "author": f"u/{author}",
                    "num_comments": pdata.get("num_comments", 0)
                })
    except Exception as e:
        print(f"Error fetching Reddit {subreddit}: {e}")
    return posts

def categorize_title(title: str) -> str:
    lower = title.lower()
    if any(k in lower for k in ["ai", "tech", "software", "nvidia", "apple", "google", "meta", "crypto", "bitcoin"]):
        return "Technology"
    if any(k in lower for k in ["election", "senate", "trump", "biden", "harris", "vote", "gop", "democrat", "court", "policy"]):
        return "Politics"
    if any(k in lower for k in ["stock", "inflation", "market", "economy", "fed", "rate", "earnings", "bank"]):
        return "Business"
    if any(k in lower for k in ["space", "nasa", "climate", "cancer", "health", "science", "physics"]):
        return "Science"
    if any(k in lower for k in ["movie", "actor", "music", "game", "nfl", "nba", "oscar"]):
        return "Entertainment"
    return "General"

def cluster_and_persist(db, raw_articles, source_name, source_type):
    """Cluster raw incoming articles and store into Topics, Articles, and Sentiments."""
    # Ensure source exists
    source = db.query(models.Source).filter(models.Source.name == source_name).first()
    if not source:
        source = models.Source(name=source_name, type=source_type, url="")
        db.add(source)
        db.commit()
        db.refresh(source)

    existing_topics = db.query(models.Topic).all()
    inserted_count = 0

    for item in raw_articles:
        # Check duplicate article
        exists = db.query(models.Article).filter(models.Article.title == item["title"]).first()
        if exists:
            continue

        art = models.Article(
            source_id=source.id,
            title=item["title"],
            url=item["url"],
            raw_content=item["content"][:2000],
            published_at=item["published_at"],
            author=item["author"]
        )
        db.add(art)
        db.commit()
        db.refresh(art)
        inserted_count += 1

        # Determine clustering match
        art_tokens = clean_tokens(art.title + " " + (art.raw_content or ""))
        matched_topic = None

        for topic in existing_topics:
            topic_tokens = clean_tokens(topic.title + " " + (topic.summary or ""))
            sim = calculate_jaccard(art_tokens, topic_tokens)
            if sim >= 0.25: # Jaccard threshold for topic affinity
                matched_topic = topic
                break

        entities = extract_named_entities(art.title + " " + (art.raw_content or ""))
        timeline_marker = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "headline": art.title,
            "source": source_name,
            "url": art.url
        }

        if not matched_topic:
            category = categorize_title(art.title)
            summary = f"Synthesized coverage across news sources regarding {art.title[:120]}..."
            matched_topic = models.Topic(
                title=art.title,
                summary=summary,
                category=category,
                first_seen=datetime.datetime.utcnow(),
                last_updated=datetime.datetime.utcnow(),
                entities_json=entities,
                timeline_json=[timeline_marker]
            )
            db.add(matched_topic)
            db.commit()
            db.refresh(matched_topic)
            existing_topics.append(matched_topic)
        else:
            matched_topic.last_updated = datetime.datetime.utcnow()
            # Merge entities
            current_ents = set(matched_topic.entities_json or [])
            current_ents.update(entities)
            matched_topic.entities_json = list(current_ents)[:12]

            # Append timeline marker if not already present
            timeline = list(matched_topic.timeline_json or [])
            if not any(m.get("headline") == art.title for m in timeline):
                timeline.append(timeline_marker)
            matched_topic.timeline_json = timeline
            db.commit()

        # Link Article to Topic
        link = models.ArticleTopic(article_id=art.id, topic_id=matched_topic.id)
        db.add(link)

        # Generate Sentiment & Discussion placeholder
        score, controversy = simple_sentiment_analysis(art.title)
        sentiment = models.Sentiment(
            topic_id=matched_topic.id,
            overall_score=score,
            breakdown_json={"pos": score if score > 0 else 0, "neg": abs(score) if score < 0 else 0, "controversy": controversy}
        )
        db.add(sentiment)

        # Discussion representation
        top_tags = list(clean_tokens(art.title))[:5]
        discussion = models.Discussion(
            topic_id=matched_topic.id,
            platform=source_name,
            raw_comments_text=f"Aggregated social discussion focusing on: {', '.join(top_tags)}",
            sentiment_score=score,
            comment_topics=top_tags
        )
        db.add(discussion)
        db.commit()

    return inserted_count

def ingest_social_firehose(limit_per_source: int = 5):
    """Ingest simulated real-time micro-commentary from Bluesky AT Protocol Jetstream and Mastodon public timelines."""
    db = SessionLocal()
    total_added = 0
    try:
        # Simulated live Bluesky AT Protocol firehose events
        bluesky_samples = [
            {
                "title": f"Bluesky Pulse: Global AI governance summit agrees on open safety standard [{datetime.datetime.utcnow().strftime('%H:%M:%S')}]",
                "url": f"https://bsky.app/profile/techwatcher.bsky.social/post/{int(datetime.datetime.utcnow().timestamp())}",
                "content": "Live AT Protocol event: delegations endorse transparent evaluation frameworks for foundation models.",
                "published_at": datetime.datetime.utcnow(),
                "author": "@techwatcher.bsky.social"
            },
            {
                "title": f"Bluesky Pulse: Major breakthroughs reported in compact fusion reactor containment [{datetime.datetime.utcnow().strftime('%H:%M:%S')}]",
                "url": f"https://bsky.app/profile/sciencepulse.bsky.social/post/{int(datetime.datetime.utcnow().timestamp())}",
                "content": "High-temperature superconducting magnets reach steady plasma containment milestone.",
                "published_at": datetime.datetime.utcnow(),
                "author": "@sciencepulse.bsky.social"
            }
        ]
        total_added += cluster_and_persist(db, bluesky_samples[:limit_per_source], "Bluesky Jetstream", "social")

        # Simulated live Mastodon public timeline events
        mastodon_samples = [
            {
                "title": f"Mastodon Timeline: Open source decentralized networks surge in active node deployments [{datetime.datetime.utcnow().strftime('%H:%M:%S')}]",
                "url": f"https://mastodon.social/@fediverse/posts/{int(datetime.datetime.utcnow().timestamp())}",
                "content": "ActivityPub federation records exponential peer-to-peer traffic increases across global servers.",
                "published_at": datetime.datetime.utcnow(),
                "author": "@fediverse@mastodon.social"
            }
        ]
        total_added += cluster_and_persist(db, mastodon_samples[:limit_per_source], "Mastodon Fediverse", "social")
    finally:
        db.close()
    return total_added

def run_pipeline_standalone():
    """Main execution point for news aggregation and clustering."""
    db = SessionLocal()
    total_added = 0
    try:
        # 1. Google News Top Stories
        google_news = fetch_rss_feed("https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", limit=15)
        total_added += cluster_and_persist(db, google_news, "Google News", "mainstream")

        # 2. Yahoo News
        yahoo_news = fetch_rss_feed("https://news.yahoo.com/rss", limit=15)
        total_added += cluster_and_persist(db, yahoo_news, "Yahoo News", "mainstream")

        # 3. Reddit News
        reddit_news = fetch_reddit_posts(subreddit="news", limit=15)
        total_added += cluster_and_persist(db, reddit_news, "Reddit", "social")

        # 4. Social Firehose
        total_added += ingest_social_firehose()

    finally:
        db.close()
    return total_added

if __name__ == "__main__":
    count = run_pipeline_standalone()
    print(f"Pipeline executed successfully. Processed and inserted {count} items.")
