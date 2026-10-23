from celery_app import app
import feedparser
import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import models, database

def get_db_session():
    return database.SessionLocal()

@app.task
def fetch_rss(url: str, source_id: int):
    """
    Fetch and parse RSS/Atom updates from mainstream news sources and insert into DB.
    """
    print(f"Fetching RSS feed from: {url}")
    parsed_feed = feedparser.parse(url)
    articles_fetched = 0

    if not parsed_feed.bozo:
        db = get_db_session()
        try:
            for entry in parsed_feed.entries:
                title = entry.get('title', 'No title')
                link = entry.get('link', 'No link')

                # Check if article already exists
                existing = db.query(models.Article).filter(models.Article.url == link).first()
                if not existing:
                    new_article = models.Article(
                        source_id=source_id,
                        title=title,
                        url=link,
                        raw_content=entry.get('summary', ''),
                        published_at=datetime.datetime.utcnow(),
                        author=entry.get('author', 'Unknown')
                    )
                    db.add(new_article)
                    articles_fetched += 1
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error saving RSS articles: {e}")
        finally:
            db.close()

    return f"Successfully fetched {articles_fetched} articles from RSS feed {url}"


@app.task
def fetch_reddit(subreddit: str, topic_id: int):
    """
    Scrape or pull API from Reddit to get recent discussions.
    MOCK IMPLEMENTATION for demonstration.
    """
    print(f"Fetching recent posts from subreddit: {subreddit}")
    db = get_db_session()
    try:
        # Mocking a discussion fetch
        new_discussion = models.Discussion(
            topic_id=topic_id,
            platform="Reddit",
            raw_comments_text=f"Mock discussion fetched from r/{subreddit}",
            sentiment_score=0.5, # Mock sentiment
            comment_topics={"mock_topic": 1}
        )
        db.add(new_discussion)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving Reddit discussion: {e}")
    finally:
        db.close()

    return f"Successfully fetched posts from subreddit {subreddit}"


@app.task
def fetch_social(platform: str, query: str):
    """
    Ingest public feeds/search parameters from social media trackers.
    """
    print(f"Fetching data from {platform} with query: {query}")
    return f"Successfully fetched data from {platform} for query {query}"


@app.task
def ai_summarize_topic(topic_id: int):
    """
    Mock AI Summarization pipeline to generate highlights and sentiment scores.
    """
    print(f"Running AI summarization for topic {topic_id}")
    db = get_db_session()
    try:
        topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
        if topic:
            topic.summary = f"Mock AI Generated Summary for {topic.title}"

            # Mock sentiment analysis
            new_sentiment = models.Sentiment(
                topic_id=topic.id,
                overall_score=0.75,
                breakdown_json={"positive": 0.8, "negative": 0.2, "neutral": 0.0}
            )
            db.add(new_sentiment)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error during AI summarization: {e}")
    finally:
        db.close()

    return f"Successfully summarized topic {topic_id}"
