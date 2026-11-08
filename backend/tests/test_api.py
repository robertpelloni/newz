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

def test_websocket_immediate_snapshot_and_request_action():
    with client.websocket_connect("/api/ws/feed") as websocket:
        # 1. First frame sent immediately upon connection should contain handshake and telemetry snapshot
        initial = websocket.receive_json()
        assert initial["event"] == "connected"
        assert "telemetry" in initial
        assert "articles" in initial["telemetry"]
        assert "topics" in initial["telemetry"]
        assert "recent_topics" in initial

        # 2. Send request_snapshot action
        websocket.send_text('{"action": "request_snapshot"}')
        reply = websocket.receive_json()
        assert reply["event"] == "telemetry_snapshot"
        assert "telemetry" in reply
        assert "recent_topics" in reply
        assert "overall_sentiment" in reply

def test_feed_sources_bulk_health_ping():
    res = client.post("/api/sources/ping-all")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) > 0
    for s in items:
        assert "id" in s
        assert "status" in s
        assert "latency_ms" in s
        assert s["status"] in ["healthy", "degraded", "unreachable"]

def test_get_topics_multi_criteria_sorting():
    for sort_param in ["latest", "articles", "controversy", "sentiment"]:
        res = client.get(f"/api/topics?sort_by={sort_param}&page_size=5")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "sort_by" in data
        assert data["sort_by"] == sort_param
        items = data["items"]
        if len(items) >= 2:
            if sort_param == "articles":
                assert items[0]["article_count"] >= items[1]["article_count"]
            elif sort_param == "controversy":
                assert items[0]["controversy_score"] >= items[1]["controversy_score"]

def test_autopilot_settings_lifecycle():
    # 1. Get current status
    res = client.get("/api/settings/autopilot")
    assert res.status_code == 200
    state = res.json()
    assert "enabled" in state
    assert "interval_seconds" in state

    # 2. Toggle enabled to True
    post_res = client.post("/api/settings/autopilot", json={"enabled": True, "interval_seconds": 45})
    assert post_res.status_code == 200
    updated = post_res.json()["autopilot"]
    assert updated["enabled"] is True
    assert updated["interval_seconds"] == 45

    # 3. Toggle back to False
    reset_res = client.post("/api/settings/autopilot", json={"enabled": False})
    assert reset_res.status_code == 200
    assert reset_res.json()["autopilot"]["enabled"] is False

def test_topic_detail_timeline_ordering_and_filtering():
    # Fetch first available topic
    topics_res = client.get("/api/topics?page_size=1")
    assert topics_res.status_code == 200
    items = topics_res.json()["items"]
    if len(items) > 0:
        topic_id = items[0]["id"]
        # Query with desc ordering
        res_desc = client.get(f"/api/topics/{topic_id}?timeline_order=desc")
        assert res_desc.status_code == 200
        tl_desc = res_desc.json()["topic"]["timeline"]
        if len(tl_desc) >= 2:
            assert tl_desc[0]["timestamp"] >= tl_desc[1]["timestamp"]

        # Query with asc ordering
        res_asc = client.get(f"/api/topics/{topic_id}?timeline_order=asc")
        assert res_asc.status_code == 200
        tl_asc = res_asc.json()["topic"]["timeline"]
        if len(tl_asc) >= 2:
            assert tl_asc[0]["timestamp"] <= tl_asc[1]["timestamp"]

def test_topic_detail_entity_matrix_endpoint():
    topics_res = client.get("/api/topics?page_size=1")
    assert topics_res.status_code == 200
    items = topics_res.json()["items"]
    if len(items) > 0:
        topic_id = items[0]["id"]
        res = client.get(f"/api/topics/{topic_id}/entities")
        assert res.status_code == 200
        data = res.json()
        assert "topic_id" in data
        assert "total_entities" in data
        assert "entities" in data
        assert isinstance(data["entities"], list)
        for ent in data["entities"]:
            assert "entity" in ent
            assert "mention_count" in ent
            assert "citations" in ent

def test_sentiment_pulse_category_filter():
    # 1. Query pulse overall
    res_all = client.get("/api/sentiment/pulse")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert "overall_sentiment" in data_all
    assert "category" in data_all
    assert data_all["category"] == "All"

    # 2. Query pulse scoped to Technology
    res_tech = client.get("/api/sentiment/pulse?category=Technology")
    assert res_tech.status_code == 200
    data_tech = res_tech.json()
    assert "overall_sentiment" in data_tech
    assert data_tech["category"] == "Technology"
    assert "positive_ratio" in data_tech
    assert "negative_ratio" in data_tech

def test_export_topics_with_sorting():
    # 1. JSON export with sort_by=articles
    res_json = client.get("/api/topics/export?format=json&sort_by=articles")
    assert res_json.status_code == 200
    items = res_json.json()
    assert isinstance(items, list)
    if len(items) >= 2:
        assert items[0]["article_count"] >= items[1]["article_count"]

    # 2. CSV export with sort_by=controversy
    res_csv = client.get("/api/topics/export?format=csv&sort_by=controversy")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "controversy_score" in res_csv.text

def test_sources_opml_export_and_import():
    import uuid
    # 1. Test OPML export
    res_export = client.get("/api/sources/opml")
    assert res_export.status_code == 200
    assert "application/xml" in res_export.headers["content-type"]
    assert "<opml version=\"2.0\">" in res_export.text
    assert "<outline" in res_export.text

    # 2. Test OPML import with distinct URLs
    uid = uuid.uuid4().hex[:8]
    url1 = f"https://example.com/tech-radar-{uid}.xml"
    url2 = f"https://example.com/ai-pulse-{uid}.xml"

    sample_opml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
      <head>
        <title>Test OPML Subscriptions</title>
      </head>
      <body>
        <outline text="Tech Feeds" title="Tech Feeds">
          <outline text="Test Tech Radar" title="Test Tech Radar" type="rss" xmlUrl="{url1}" htmlUrl="https://example.com" />
          <outline text="Test AI Pulse" title="Test AI Pulse" type="rss" xmlUrl="{url2}" htmlUrl="https://example.com" />
        </outline>
      </body>
    </opml>"""

    res_import = client.post(
        "/api/sources/opml",
        headers={"Content-Type": "application/xml"},
        content=sample_opml
    )
    assert res_import.status_code == 200
    data = res_import.json()
    assert data["total_found"] == 2
    assert data["imported_count"] == 2
    assert data["existing_count"] == 0

    # 3. Test re-importing same feeds (should mark existing)
    res_reimport = client.post(
        "/api/sources/opml",
        headers={"Content-Type": "application/xml"},
        content=sample_opml
    )
    assert res_reimport.status_code == 200
    re_data = res_reimport.json()
    assert re_data["total_found"] == 2
    assert re_data["existing_count"] == 2
    assert re_data["imported_count"] == 0

def test_topics_incremental_delta_sync():
    # 1. Delta sync without since timestamp (returns recent batch)
    res = client.get("/api/topics/delta?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "server_time" in data
    assert "topics_count" in data
    assert "topics" in data
    assert isinstance(data["topics"], list)
    assert data["topics_count"] == len(data["topics"])

    # 2. Delta sync with an ancient timestamp (should return all recent)
    res_ancient = client.get("/api/topics/delta?since=2000-01-01T00:00:00Z&limit=10")
    assert res_ancient.status_code == 200
    data_ancient = res_ancient.json()
    assert data_ancient["topics_count"] >= 0

    # 3. Delta sync with future timestamp (should return 0 topics)
    res_future = client.get("/api/topics/delta?since=2099-01-01T00:00:00Z")
    assert res_future.status_code == 200
    data_future = res_future.json()
    assert data_future["topics_count"] == 0
    assert len(data_future["topics"]) == 0

    # 4. Delta sync with invalid timestamp should return HTTP 400
    res_invalid = client.get("/api/topics/delta?since=not-a-timestamp")
    assert res_invalid.status_code == 400
    assert "Invalid ISO timestamp format" in res_invalid.json()["detail"]

def test_sources_health_summary_endpoint():
    res = client.get("/api/sources/health-summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_sources" in data
    assert "healthy_count" in data
    assert "degraded_count" in data
    assert "unreachable_count" in data
    assert "uptime_percentage" in data
    assert "average_latency_ms" in data
    assert "probed_at" in data
    assert "sources" in data
    assert isinstance(data["sources"], list)
    assert data["total_sources"] == len(data["sources"])
    assert 0.0 <= data["uptime_percentage"] <= 100.0
    assert data["average_latency_ms"] >= 0.0

def test_topics_search_across_correlated_articles():
    # Query with a keyword common across news articles (e.g. 'Timeline' or 'deployments')
    res = client.get("/api/topics?q=deployments")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert isinstance(data["items"], list)
    # Validate no duplicate topic ids returned from joins
    ids = [t["id"] for t in data["items"]]
    assert len(ids) == len(set(ids))
