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
