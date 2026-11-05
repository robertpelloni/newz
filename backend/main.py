from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Set
import os
import signal
import sys
import asyncio
import json
import io
import csv

try:
    from backend import models, database, schemas
except ImportError:
    import models, database, schemas

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Omnifeed API", version="0.3.0")

class ConnectionManager:
    """Manages active WebSocket connections for live feed streaming."""
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)

manager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize tables
models.Base.metadata.create_all(bind=database.engine)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Omnifeed API", "version": "0.3.0"}

@app.websocket("/api/ws/feed")
async def websocket_feed_endpoint(websocket: WebSocket):
    """Real-time streaming channel for new topics, feed updates, and live alerts."""
    await manager.connect(websocket)
    try:
        # Send initial handshake confirmation
        await websocket.send_json({"event": "connected", "message": "Omnifeed live stream active"})
        while True:
            # Keep connection alive and accept incoming pings or queries
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    """System health check & telemetry."""
    article_count = db.query(models.Article).count()
    topic_count = db.query(models.Topic).count()
    discussion_count = db.query(models.Discussion).count()

    return {
        "status": "healthy",
        "version": "0.3.0",
        "database": "connected",
        "counts": {
            "articles": article_count,
            "topics": topic_count,
            "discussions": discussion_count
        }
    }

@app.get("/api/sources")
def get_sources(db: Session = Depends(get_db)):
    """List all registered news and social feed sources."""
    sources = db.query(models.Source).all()
    if not sources:
        # Default source catalogue
        defaults = [
            {"id": 1, "name": "Google News", "type": "mainstream", "url": "https://news.google.com/rss", "active": True},
            {"id": 2, "name": "Yahoo News", "type": "mainstream", "url": "https://news.yahoo.com/rss", "active": True},
            {"id": 3, "name": "Hacker News", "type": "aggregator", "url": "https://hacker-news.firebaseio.com/v0", "active": True},
            {"id": 4, "name": "Reddit (r/news, r/tech)", "type": "social", "url": "https://reddit.com/r/news/.json", "active": True},
            {"id": 5, "name": "MSN News", "type": "mainstream", "url": "https://rss.msn.com", "active": True},
        ]
        return defaults
    return [{"id": s.id, "name": s.name, "type": s.type, "url": s.url, "active": True} for s in sources]

@app.get("/api/topics")
def get_topics(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve paginated topics with search and category filtering."""
    query = db.query(models.Topic)
    if category and category.lower() != "all":
        query = query.filter(models.Topic.category.ilike(f"%{category}%"))
    if q:
        query = query.filter(models.Topic.title.ilike(f"%{q}%") | models.Topic.summary.ilike(f"%{q}%"))

    total = query.count()
    skip = (page - 1) * page_size
    topics = query.order_by(models.Topic.last_updated.desc()).offset(skip).limit(page_size).all()

    total_pages = max(1, (total + page_size - 1) // page_size)

    # Eagerly prepare response
    items = []
    for t in topics:
        article_count = db.query(models.ArticleTopic).filter(models.ArticleTopic.topic_id == t.id).count()
        items.append({
            "id": t.id,
            "title": t.title,
            "summary": t.summary,
            "category": t.category,
            "first_seen": t.first_seen.isoformat() if t.first_seen else None,
            "last_updated": t.last_updated.isoformat() if t.last_updated else None,
            "article_count": article_count,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@app.get("/api/topics/export")
def export_topics(
    format: str = Query("json", pattern="^(json|csv)$"),
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export clustered intelligence topics to CSV or JSON formats for analysis."""
    query = db.query(models.Topic)
    if category and category.lower() != "all":
        query = query.filter(models.Topic.category.ilike(f"%{category}%"))
    if q:
        query = query.filter(models.Topic.title.ilike(f"%{q}%") | models.Topic.summary.ilike(f"%{q}%"))

    topics = query.order_by(models.Topic.last_updated.desc()).all()
    data = []
    for t in topics:
        article_count = db.query(models.ArticleTopic).filter(models.ArticleTopic.topic_id == t.id).count()
        data.append({
            "id": t.id,
            "title": t.title,
            "category": t.category or "General",
            "article_count": article_count,
            "summary": t.summary or "",
            "first_seen": t.first_seen.isoformat() if t.first_seen else "",
            "last_updated": t.last_updated.isoformat() if t.last_updated else ""
        })

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "title", "category", "article_count", "summary", "first_seen", "last_updated"])
        writer.writeheader()
        writer.writerows(data)
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="omnifeed_topics.csv"'}
        )

    return JSONResponse(
        content=data,
        headers={"Content-Disposition": 'attachment; filename="omnifeed_topics.json"'}
    )

@app.get("/api/topics/{topic_id}")
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    articles = db.query(models.Article).join(models.ArticleTopic).filter(models.ArticleTopic.topic_id == topic_id).all()
    discussions = db.query(models.Discussion).filter(models.Discussion.topic_id == topic_id).all()
    sentiments = db.query(models.Sentiment).filter(models.Sentiment.topic_id == topic_id).all()

    return {
        "topic": {
            "id": topic.id,
            "title": topic.title,
            "summary": topic.summary,
            "category": topic.category,
            "first_seen": topic.first_seen.isoformat() if topic.first_seen else None,
            "last_updated": topic.last_updated.isoformat() if topic.last_updated else None,
            "entities": topic.entities_json or [],
            "timeline": topic.timeline_json or [],
        },
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "url": a.url,
                "author": a.author,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "source_name": a.source.name if a.source else "News Feed"
            } for a in articles
        ],
        "discussions": [
            {
                "id": d.id,
                "platform": d.platform,
                "raw_comments_text": d.raw_comments_text,
                "sentiment_score": d.sentiment_score,
                "comment_topics": d.comment_topics
            } for d in discussions
        ],
        "sentiments": [
            {
                "id": s.id,
                "overall_score": s.overall_score,
                "breakdown_json": s.breakdown_json
            } for s in sentiments
        ]
    }

@app.get("/api/sentiment/pulse")
def get_sentiment_pulse(db: Session = Depends(get_db)):
    """Aggregate pulse and controversy metrics."""
    sentiments = db.query(models.Sentiment).order_by(models.Sentiment.id.desc()).limit(100).all()
    if not sentiments:
        return {
            "overall_sentiment": 0.0,
            "positive_ratio": 0.33,
            "negative_ratio": 0.33,
            "neutral_ratio": 0.34,
            "sample_size": 0
        }

    scores = [s.overall_score for s in sentiments if s.overall_score is not None]
    if not scores:
        avg = 0.0
    else:
        avg = sum(scores) / len(scores)

    pos = sum(1 for x in scores if x > 0.1)
    neg = sum(1 for x in scores if x < -0.1)
    neu = len(scores) - (pos + neg)
    total = max(len(scores), 1)

    return {
        "overall_sentiment": round(avg, 2),
        "positive_ratio": round(pos / total, 2),
        "negative_ratio": round(neg / total, 2),
        "neutral_ratio": round(neu / total, 2),
        "sample_size": len(scores)
    }

@app.post("/api/actions/sync")
async def trigger_sync():
    """Trigger background ingestion and clustering and broadcast notification."""
    try:
        from worker.tasks import run_pipeline_standalone
        count = run_pipeline_standalone()
        await manager.broadcast({
            "event": "sync_completed",
            "synced_articles": count,
            "message": f"Successfully ingested and clustered {count} items."
        })
        return {"status": "success", "synced_articles": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/firehose/simulate")
async def trigger_firehose():
    """Ingest simulated real-time micro-commentary from Bluesky Jetstream & Mastodon Fediverse."""
    try:
        from worker.tasks import ingest_social_firehose
        count = ingest_social_firehose()
        await manager.broadcast({
            "event": "firehose_pulse",
            "ingested_events": count,
            "message": f"Live Firehose: Streamed {count} micro-commentary events from Bluesky & Mastodon."
        })
        return {"status": "success", "ingested_events": count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/shutdown")
def shutdown_system():
    """Gracefully terminate backend process."""
    def kill_later():
        import time
        time.sleep(0.5)
        os.kill(os.getpid(), signal.SIGTERM)

    import threading
    threading.Thread(target=kill_later).start()
    return {"status": "shutting down"}
