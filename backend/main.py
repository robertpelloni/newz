from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import models, database, schemas


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Omnifeed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Omnifeed API"}

@app.get("/api/topics", response_model=List[schemas.TopicResponse])
def get_topics(
    skip: int = 0,
    limit: int = 10,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Topic)
    if category:
        query = query.filter(models.Topic.category == category)
    topics = query.order_by(models.Topic.last_updated.desc()).offset(skip).limit(limit).all()
    return topics

@app.get("/api/topics/{topic_id}", response_model=schemas.TopicDeepDive)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    articles = db.query(models.Article).join(models.ArticleTopic).filter(models.ArticleTopic.topic_id == topic_id).all()
    discussions = db.query(models.Discussion).filter(models.Discussion.topic_id == topic_id).all()
    sentiments = db.query(models.Sentiment).filter(models.Sentiment.topic_id == topic_id).all()

    return {
        "topic": topic,
        "articles": articles,
        "discussions": discussions,
        "sentiments": sentiments
    }

@app.get("/api/sentiment/global")
def get_global_sentiment(db: Session = Depends(get_db)):
    sentiments = db.query(models.Sentiment).order_by(models.Sentiment.id.desc()).limit(100).all()
    if not sentiments:
        return {"overall_sentiment": 0, "status": "No data"}

    total_score = sum(s.overall_score for s in sentiments if s.overall_score is not None)
    avg_score = total_score / len(sentiments)
    return {
        "overall_sentiment": avg_score,
        "recent_entries": len(sentiments)
    }
