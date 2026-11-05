"use client";

import React, { useState, useEffect } from "react";

interface Topic {
  id: number;
  title: string;
  summary: string;
  category: string;
  first_seen: string | null;
  last_updated: string | null;
  article_count: number;
}

interface SystemStatus {
  status: string;
  version: string;
  database: string;
  counts: {
    articles: number;
    topics: number;
    discussions: number;
  };
}

interface SentimentPulse {
  overall_sentiment: number;
  positive_ratio: number;
  negative_ratio: number;
  neutral_ratio: number;
  sample_size: number;
}

interface TopicDetail {
  topic: Topic & {
    entities?: string[];
    timeline?: Array<{
      timestamp: string;
      headline: string;
      source: string;
      url: string;
    }>;
  };
  articles: Array<{
    id: number;
    title: string;
    url: string;
    author: string;
    published_at: string | null;
    source_name: string;
  }>;
  discussions: Array<{
    id: number;
    platform: string;
    raw_comments_text: string;
    sentiment_score: number;
    comment_topics: string[];
  }>;
  sentiments: Array<{
    id: number;
    overall_score: number;
    breakdown_json: any;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [pulse, setPulse] = useState<SentimentPulse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [oledMode, setOledMode] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTopics, setTotalTopics] = useState<number>(0);

  const categories = ["All", "General", "Technology", "Business", "Politics", "Science", "Entertainment"];

  // Fetch initial telemetry and pulse + live WebSocket connection
  useEffect(() => {
    fetchSystemData();

    // Setup live WebSocket feed listener
    let ws: WebSocket | null = null;
    try {
      const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/ws/feed";
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setWsConnected(true);
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "sync_completed") {
            setLiveAlert(payload.message || "New stories ingested & clustered!");
            fetchSystemData();
            fetchTopics();
            setTimeout(() => setLiveAlert(null), 4000);
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn("WebSocket connection failure:", e);
    }

    const interval = setInterval(fetchSystemData, 15000);
    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery]);

  // Fetch topics whenever category, search, or pagination changes
  useEffect(() => {
    fetchTopics();
  }, [activeCategory, searchQuery, page, pageSize]);

  // Fetch deep-dive modal
  useEffect(() => {
    if (selectedTopicId) {
      fetchTopicDetail(selectedTopicId);
    } else {
      setTopicDetail(null);
    }
  }, [selectedTopicId]);

  const fetchSystemData = async () => {
    try {
      const [resStatus, resPulse] = await Promise.all([
        fetch(`${API_BASE}/api/system/status`),
        fetch(`${API_BASE}/api/sentiment/pulse`)
      ]);
      if (resStatus.ok) setStatus(await resStatus.json());
      if (resPulse.ok) setPulse(await resPulse.json());
    } catch (e) {
      console.error("Error fetching status or pulse:", e);
    }
  };

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/api/topics`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("page_size", pageSize.toString());
      if (activeCategory !== "All") url.searchParams.append("category", activeCategory);
      if (searchQuery.trim()) url.searchParams.append("q", searchQuery.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        // Support both paginated object and legacy array format
        if (data.items) {
          setTopics(data.items);
          setTotalTopics(data.total);
          setTotalPages(data.total_pages);
        } else {
          setTopics(data);
          setTotalTopics(data.length);
          setTotalPages(1);
        }
      }
    } catch (e) {
      console.error("Error fetching topics:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/topics/${id}`);
      if (res.ok) {
        setTopicDetail(await res.json());
      }
    } catch (e) {
      console.error("Error fetching topic detail:", e);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE}/api/actions/sync`, { method: "POST" });
      await fetchSystemData();
      await fetchTopics();
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShutdown = async () => {
    if (confirm("Are you sure you want to quit the backend server?")) {
      try {
        await fetch(`${API_BASE}/api/system/shutdown`, { method: "POST" });
        alert("Backend server has been signaled to shut down.");
        fetchSystemData();
      } catch (e) {
        console.error("Shutdown error:", e);
      }
    }
  };

  const handleExport = (format: "json" | "csv") => {
    setShowExportMenu(false);
    const url = new URL(`${API_BASE}/api/topics/export`);
    url.searchParams.append("format", format);
    if (activeCategory !== "All") url.searchParams.append("category", activeCategory);
    if (searchQuery.trim()) url.searchParams.append("q", searchQuery.trim());
    window.open(url.toString(), "_blank");
  };

  return (
    <div className={`min-h-screen ${oledMode ? "bg-black text-neutral-100" : "bg-slate-950 text-slate-100"} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Universal Navbar */}
      <header className={`border-b ${oledMode ? "border-neutral-800 bg-black/90" : "border-slate-800 bg-slate-900/90"} backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black tracking-wider text-cyan-400">OMNIFEED</span>
            <span className="text-xs uppercase px-2 py-0.5 font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
              v{status?.version || "0.2.1"}
            </span>
          </div>
          <span className="text-xs text-slate-400 border-l border-slate-700 pl-4 hidden md:inline">
            Aggregated Cross-Source Intelligence Engine
          </span>
        </div>

        {/* Global Controls & Status Indicators */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-slate-300 font-medium hidden sm:inline">
              {wsConnected ? "Live WS" : "Polling"}
            </span>
          </div>

          {/* OLED Contrast Switch */}
          <button
            onClick={() => setOledMode(!oledMode)}
            title="Toggle OLED High-Contrast Mode"
            className={`px-2.5 py-1.5 text-xs font-semibold rounded border transition ${oledMode ? "bg-neutral-800 text-cyan-400 border-neutral-700" : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"}`}
          >
            {oledMode ? "☀️ Contrast" : "🌙 OLED"}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export current filtered topics to CSV or JSON"
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition flex items-center space-x-1"
            >
              <span>📥 Export</span>
              <span className="text-[10px]">▼</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            title="Fetch breaking stories from all sources and update clusters"
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition shadow disabled:opacity-50"
          >
            <span>{isSyncing ? "⚡ Syncing Feeds..." : "⚡ Sync Ingestion"}</span>
          </button>

          <button
            onClick={handleShutdown}
            title="Safely terminate the backend server"
            className="px-3 py-1.5 text-xs font-semibold bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded transition"
          >
            Quit Server
          </button>
        </div>
      </header>

      {/* Live Alert Toast */}
      {liveAlert && (
        <div className="bg-cyan-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-lg transition-all animate-bounce">
          ⚡ {liveAlert}
        </div>
      )}

      {/* Main Consolidated Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Metric Bar & Intelligence Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Total Articles</span>
              <span title="Total raw items collected across all registered feeds" className="cursor-help">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-slate-100 mt-1">
              {status?.counts?.articles ?? "0"}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Active Topics</span>
              <span title="Distinct story clusters formed by keyword token similarity" className="cursor-help">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-cyan-400 mt-1">
              {status?.counts?.topics ?? "0"}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Discussions</span>
              <span title="Aggregated social commentary threads linked to topics" className="cursor-help">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {status?.counts?.discussions ?? "0"}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Overall Sentiment</span>
              <span title="Lexicon-based global sentiment polarity (-1.0 to +1.0)" className="cursor-help">ⓘ</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {pulse ? `${pulse.overall_sentiment > 0 ? "+" : ""}${Math.round(pulse.overall_sentiment * 100)}%` : "0%"}
            </div>
          </div>
        </div>

        {/* Global Controls & Filters */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Real-time Search */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, headlines, or keywords..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Clustered Topics Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-200 flex items-center space-x-2">
              <span>Dynamic Clustered Topics</span>
              <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {totalTopics} total
              </span>
            </h2>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  ◀ Prev
                </button>
                <span className="text-slate-400 px-1">
                  Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm animate-pulse">
              Loading clustered intelligence feeds...
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              No matching topic clusters found. Try hitting ⚡ Sync Ingestion.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTopicId(t.id)}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col justify-between transition cursor-pointer group shadow-sm hover:shadow-cyan-950/20"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                        {t.category || "General"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {t.article_count} {t.article_count === 1 ? "source" : "sources"}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-100 text-sm group-hover:text-cyan-300 transition line-clamp-2">
                      {t.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {t.summary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>Deep-dive cluster →</span>
                    <span>{t.last_updated ? new Date(t.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 pt-4 text-xs">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-600 text-slate-300 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition"
              >
                ◀ Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`w-8 h-8 rounded-lg font-medium transition ${page === num ? "bg-cyan-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-600 text-slate-300 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition"
              >
                Next ▶
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Topic Detail Modal */}
      {selectedTopicId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedTopicId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition text-xs"
            >
              ✕ Close
            </button>

            {topicDetail ? (
              <>
                <div className="space-y-2 pr-10">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {topicDetail.topic.category}
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">
                    {topicDetail.topic.title}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {topicDetail.topic.summary}
                  </p>
                </div>

                {/* Extracted Named Entities */}
                {topicDetail.topic.entities && topicDetail.topic.entities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Key Extracted Entities
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {topicDetail.topic.entities.map((ent, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded text-xs font-medium"
                        >
                          👤 {ent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Narrative Evolution Timeline */}
                {topicDetail.topic.timeline && topicDetail.topic.timeline.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Narrative Evolution Timeline
                    </h4>
                    <div className="relative border-l border-cyan-800/60 ml-2 pl-4 space-y-3">
                      {topicDetail.topic.timeline.map((event, idx) => (
                        <div key={idx} className="relative group">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 group-hover:scale-125 transition" />
                          <div className="text-xs">
                            <span className="text-cyan-400 font-semibold">{event.source}</span>
                            <span className="text-slate-500 ml-2">
                              {event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 mt-0.5">{event.headline}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Correlated Source Articles ({topicDetail.articles.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {topicDetail.articles.map((art) => (
                      <div key={art.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-200 truncate mr-2">{art.title}</span>
                        {art.url ? (
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline shrink-0"
                          >
                            Open Link ↗
                          </a>
                        ) : (
                          <span className="text-slate-500">Internal</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aggregated Discussions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Community & Social Context
                  </h4>
                  <div className="space-y-2">
                    {topicDetail.discussions.length > 0 ? (
                      topicDetail.discussions.map((d) => (
                        <div key={d.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="font-semibold text-cyan-400">{d.platform}</span>
                            <span>Polarity Score: {Math.round((d.sentiment_score || 0) * 100)}%</span>
                          </div>
                          <p className="text-slate-300">{d.raw_comments_text}</p>
                          {d.comment_topics && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {d.comment_topics.map((t, idx) => (
                                <span key={idx} className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic">No community discussions recorded for this topic.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
                Loading cluster intelligence deep dive...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
