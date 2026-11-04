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
  topic: Topic;
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
  const [loading, setLoading] = useState<boolean>(true);

  const categories = ["All", "General", "Technology", "Business", "Politics", "Science", "Entertainment"];

  // Fetch initial telemetry and pulse
  useEffect(() => {
    fetchSystemData();
  }, []);

  // Fetch topics whenever category or search changes
  useEffect(() => {
    fetchTopics();
  }, [activeCategory, searchQuery]);

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
      if (activeCategory !== "All") url.searchParams.append("category", activeCategory);
      if (searchQuery.trim()) url.searchParams.append("q", searchQuery.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        setTopics(await res.json());
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Universal Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black tracking-wider text-cyan-400">OMNIFEED</span>
            <span className="text-xs uppercase px-2 py-0.5 font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
              v{status?.version || "0.2.0"}
            </span>
          </div>
          <span className="text-xs text-slate-400 border-l border-slate-700 pl-4 hidden md:inline">
            Aggregated Cross-Source Intelligence Engine
          </span>
        </div>

        {/* Global Controls & Status Indicators */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${status ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-slate-300 font-medium">
              {status ? "Online" : "Connecting..."}
            </span>
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center space-x-2">
              <span>Dynamic Clustered Topics</span>
              <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {topics.length} clusters
              </span>
            </h2>
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
