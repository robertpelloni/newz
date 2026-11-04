from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class TopicBase(BaseModel):
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None

class TopicResponse(TopicBase):
    id: int
    first_seen: datetime
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)

class ArticleResponse(BaseModel):
    id: int
    title: str
    url: str
    published_at: Optional[datetime] = None
    author: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DiscussionResponse(BaseModel):
    id: int
    platform: str
    sentiment_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class SentimentResponse(BaseModel):
    id: int
    overall_score: float

    model_config = ConfigDict(from_attributes=True)

class TopicDeepDive(BaseModel):
    topic: TopicResponse
    articles: List[ArticleResponse]
    discussions: List[DiscussionResponse]
    sentiments: List[SentimentResponse]
