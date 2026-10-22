from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
import datetime

# Conditional import for Vector to avoid breaking tests if pgvector not properly installed
try:
    from pgvector.sqlalchemy import Vector
    HAS_VECTOR = True
except ImportError:
    HAS_VECTOR = False

from database import Base

class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # mainstream, aggregator, social
    url = Column(String)

class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"))
    title = Column(String, index=True)
    url = Column(String)
    raw_content = Column(Text)
    published_at = Column(DateTime)
    author = Column(String)

    source = relationship("Source")

class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    summary = Column(Text)
    category = Column(String)
    # Use Vector if available, else standard JSON for embedding backup
    if HAS_VECTOR:
        embedding_vector = Column(Vector(1536))
    else:
        embedding_vector = Column(JSON)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

class ArticleTopic(Base):
    __tablename__ = "article_topics"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))

    article = relationship("Article")
    topic = relationship("Topic")

class Discussion(Base):
    __tablename__ = "discussions"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    platform = Column(String) # reddit, hackernews, twitter, etc.
    raw_comments_text = Column(Text)
    sentiment_score = Column(Float)
    comment_topics = Column(JSON)

    topic = relationship("Topic")

class Sentiment(Base):
    __tablename__ = "sentiments"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    overall_score = Column(Float)
    breakdown_json = Column(JSON)

    topic = relationship("Topic")
