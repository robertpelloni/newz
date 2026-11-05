import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()

def test_system_status():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "counts" in data

def test_get_sources():
    response = client.get("/api/sources")
    assert response.status_code == 200
    sources = response.json()
    assert len(sources) > 0

def test_get_topics():
    response = client.get("/api/topics")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "total_pages" in data
    assert isinstance(data["items"], list)

def test_get_topics_pagination():
    response = client.get("/api/topics?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) <= 5

def test_sentiment_pulse():
    response = client.get("/api/sentiment/pulse")
    assert response.status_code == 200
    data = response.json()
    assert "overall_sentiment" in data

def test_export_topics_json():
    response = client.get("/api/topics/export?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")
    assert "attachment; filename=\"omnifeed_topics.json\"" in response.headers.get("content-disposition", "")
    data = response.json()
    assert isinstance(data, list)

def test_export_topics_csv():
    response = client.get("/api/topics/export?format=csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "attachment; filename=\"omnifeed_topics.csv\"" in response.headers.get("content-disposition", "")
    assert "id,title,category,article_count" in response.text

def test_websocket_feed():
    with client.websocket_connect("/api/ws/feed") as websocket:
        data = websocket.receive_json()
        assert data["event"] == "connected"
        websocket.send_text("ping")
        pong = websocket.receive_json()
        assert pong["event"] == "pong"

def test_topic_detail_entities_and_timeline():
    # Fetch first topic
    topics_res = client.get("/api/topics")
    assert topics_res.status_code == 200
    items = topics_res.json()["items"]
    if items:
        topic_id = items[0]["id"]
        detail_res = client.get(f"/api/topics/{topic_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert "topic" in detail
        assert "entities" in detail["topic"]
        assert "timeline" in detail["topic"]
        assert isinstance(detail["topic"]["entities"], list)
        assert isinstance(detail["topic"]["timeline"], list)

def test_social_firehose_ingest_and_broadcast():
    response = client.post("/api/firehose/simulate")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "ingested_events" in data

def test_topic_ai_summary_endpoint():
    topics_res = client.get("/api/topics")
    assert topics_res.status_code == 200
    items = topics_res.json()["items"]
    if items:
        topic_id = items[0]["id"]
        response = client.post(f"/api/topics/{topic_id}/summarize")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "summary" in data
        assert len(data["summary"]) > 0
