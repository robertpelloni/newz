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

def test_websocket_optimized_broadcast_payload():
    with client.websocket_connect("/api/ws/feed") as websocket:
        init_data = websocket.receive_json()
        assert init_data["event"] == "connected"

        # Trigger simulated firehose which broadcasts enriched payload
        firehose_res = client.post("/api/firehose/simulate")
        assert firehose_res.status_code == 200

        # Receive streamed broadcast event
        msg = websocket.receive_json()
        assert msg["event"] == "firehose_pulse"
        assert "telemetry" in msg
        assert "articles" in msg["telemetry"]
        assert "overall_sentiment" in msg
        assert "recent_topics" in msg
        assert isinstance(msg["recent_topics"], list)

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

def test_chronological_timeline_metadata_and_ordering():
    # Ingest firehose to ensure fresh timeline markers
    client.post("/api/firehose/simulate")
    topics_res = client.get("/api/topics")
    assert topics_res.status_code == 200
    items = topics_res.json()["items"]
    assert len(items) > 0
    topic_id = items[0]["id"]
    detail_res = client.get(f"/api/topics/{topic_id}")
    assert detail_res.status_code == 200
    timeline = detail_res.json()["topic"]["timeline"]
    assert isinstance(timeline, list)
    if len(timeline) > 1:
        # Check chronological timestamps order
        timestamps = [m.get("timestamp") for m in timeline if m.get("timestamp")]
        assert timestamps == sorted(timestamps)
    for marker in timeline:
        assert "headline" in marker
        assert "source" in marker

def test_custom_feed_subscription_lifecycle():
    # 1. Create a custom feed source
    payload = {
        "name": "MIT Technology Review",
        "type": "tech",
        "url": "https://www.technologyreview.com/feed/"
    }
    create_res = client.post("/api/sources", json=payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["name"] == "MIT Technology Review"
    assert created["url"] == "https://www.technologyreview.com/feed/"
    source_id = created["id"]

    # 2. Check source appears in GET /api/sources with article_count field
    get_res = client.get("/api/sources")
    assert get_res.status_code == 200
    sources = get_res.json()
    target_src = next((s for s in sources if s["id"] == source_id), None)
    assert target_src is not None
    assert "article_count" in target_src
    assert isinstance(target_src["article_count"], int)

    # 3. Duplicate insertion returns existing source
    dup_res = client.post("/api/sources", json=payload)
    assert dup_res.status_code == 200
    assert dup_res.json()["id"] == source_id

    # 4. Delete the custom source
    del_res = client.delete(f"/api/sources/{source_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # 5. Check source is no longer present
    get_after = client.get("/api/sources")
    assert not any(s["id"] == source_id for s in get_after.json())

def test_feed_source_health_ping():
    # Fetch first available source or register a dummy source
    sources_res = client.get("/api/sources")
    assert sources_res.status_code == 200
    sources = sources_res.json()
    assert len(sources) > 0
    source_id = sources[0]["id"]

    # Execute health ping
    ping_res = client.post(f"/api/sources/{source_id}/ping")
    assert ping_res.status_code == 200
    data = ping_res.json()
    assert data["id"] == source_id
    assert "status" in data
    assert data["status"] in ["healthy", "degraded", "unreachable"]
    assert "latency_ms" in data
    assert isinstance(data["latency_ms"], float)
