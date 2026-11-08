"use client";

import React, { useState, useEffect } from "react";
import {
  saveTopicsToIndexedDB,
  getTopicsFromIndexedDB,
  saveTopicDetailToIndexedDB,
  getTopicDetailFromIndexedDB,
  saveSourcesToIndexedDB,
  getSourcesFromIndexedDB,
  saveBookmarkAnnotationToIndexedDB,
  getBookmarkAnnotationsFromIndexedDB,
  deleteBookmarkAnnotationFromIndexedDB,
  clearOfflineIndexedDB,
  getOfflineStorageMetrics,
  importOfflineVault,
  saveBookmarksToIndexedDB,
  getBookmarksFromIndexedDB,
  saveSyncQueueToIndexedDB,
  getSyncQueueFromIndexedDB,
  compactOfflineVault,
  getStorageQuotaEstimate,
  BookmarkAnnotation,
} from "../utils/offlineStore";

interface Topic {
  id: number;
  title: string;
  summary: string;
  category: string;
  first_seen: string | null;
  last_updated: string | null;
  article_count: number;
  controversy_score?: number;
  sentiment_score?: number;
  is_breaking?: boolean;
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
      source_type?: string;
      polarity?: number;
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

interface FeedSource {
  id: number;
  name: string;
  type: string;
  url: string;
  active: boolean;
  article_count?: number;
  status?: string;
  latency_ms?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [pulse, setPulse] = useState<SentimentPulse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isFirehosing, setIsFirehosing] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState<number>(0);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [oledMode, setOledMode] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTopics, setTotalTopics] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [platformName, setPlatformName] = useState<string>("Web");
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(false);

  // Network State Diagnostics & Intermittent Connectivity Sync Engine
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [networkPingLatency, setNetworkPingLatency] = useState<number | null>(null);
  const [isSyncingDelta, setIsSyncingDelta] = useState<boolean>(false);

  // Topic Deep-Dive Timeline & Entity Options
  const [timelineOrder, setTimelineOrder] = useState<"asc" | "desc">("asc");
  const [timelinePolarityFilter, setTimelinePolarityFilter] = useState<"all" | "positive" | "negative">("all");

  // Keyboard Shortcuts & Focused Card State
  const [focusedTopicIndex, setFocusedTopicIndex] = useState<number>(-1);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string | null>(null);

  // Storage Quota Telemetry
  const [storageQuota, setStorageQuota] = useState<{ usageBytes: number; quotaBytes: number; percentUsed: number }>({
    usageBytes: 0,
    quotaBytes: 0,
    percentUsed: 0,
  });

  // Custom Feed Management State
  const [showFeedsModal, setShowFeedsModal] = useState<boolean>(false);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [feedHealthSummary, setFeedHealthSummary] = useState<{
    total: number;
    healthy: number;
    degraded: number;
    unreachable: number;
    uptimePct: number;
    avgLatency: number;
  } | null>(null);
  const [newFeedName, setNewFeedName] = useState<string>("");
  const [newFeedUrl, setNewFeedUrl] = useState<string>("");
  const [newFeedType, setNewFeedType] = useState<string>("tech");
  const [feedSubmitError, setFeedSubmitError] = useState<string | null>(null);
  const [isAddingFeed, setIsAddingFeed] = useState<boolean>(false);

  // Offline Cache Management State
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [offlineMetrics, setOfflineMetrics] = useState<{ topicCount: number; detailCount: number; sourceCount: number; estimatedBytes: number }>({
    topicCount: 0,
    detailCount: 0,
    sourceCount: 0,
    estimatedBytes: 0,
  });

  // Bookmark Annotation & Tag State
  const [bookmarkAnnotations, setBookmarkAnnotations] = useState<Record<number, BookmarkAnnotation>>({});
  const [activeBookmarkTagFilter, setActiveBookmarkTagFilter] = useState<string | null>(null);
  const [editingAnnotationTopicId, setEditingAnnotationTopicId] = useState<number | null>(null);
  const [annotationNoteInput, setAnnotationNoteInput] = useState<string>("");
  const [annotationTagsInput, setAnnotationTagsInput] = useState<string>("");

  const categories = ["All", "General", "Technology", "Business", "Politics", "Science", "Entertainment"];

  const playChime = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  // Register PWA service worker, online/offline listener, offline sync replay, and load bookmarks
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Platform detection: Tauri window object or PWA standalone mode
      const w = window as unknown as {
        __TAURI__?: unknown;
        __TAURI_INTERNALS__?: unknown;
      };
      if (w.__TAURI__ || w.__TAURI_INTERNALS__) {
        setPlatformName("Desktop");
      } else if (window.matchMedia("(display-mode: standalone)").matches) {
        setPlatformName("PWA");
      } else {
        setPlatformName("Web");
      }

      setIsOffline(!navigator.onLine);

      // Check pending offline sync actions queue
      const checkSyncQueue = async () => {
        try {
          let queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
          if (queue.length === 0) {
            const idbQueue = await getSyncQueueFromIndexedDB();
            if (idbQueue.length > 0) {
              queue = idbQueue;
              localStorage.setItem("omnifeed_sync_queue", JSON.stringify(idbQueue));
            }
          }
          setPendingSyncCount(queue.length);
        } catch (_) {}
      };
      checkSyncQueue();

      const replayOfflineQueue = async () => {
        setIsOffline(false);
        try {
          let queue: Array<any> = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
          if (queue.length === 0) {
            const idbQueue = await getSyncQueueFromIndexedDB();
            if (idbQueue.length > 0) {
              queue = idbQueue;
            }
          }
          if (queue.length > 0) {
            setLiveAlert(`Replaying ${queue.length} offline queued actions...`);
            const remaining: Array<any> = [];
            for (const action of queue) {
              try {
                if (action.type === "sync_feeds") {
                  const res = await fetch(`${API_BASE}/api/actions/sync`, { method: "POST" });
                  if (!res.ok) throw new Error("Sync failed");
                } else if (action.type === "add_feed" && action.payload) {
                  const res = await fetch(`${API_BASE}/api/sources`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(action.payload),
                  });
                  if (!res.ok) throw new Error("Add feed failed");
                } else if (action.type === "delete_feed" && action.source_id) {
                  const res = await fetch(`${API_BASE}/api/sources/${action.source_id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) throw new Error("Delete feed failed");
                }
              } catch (err) {
                // If an intermittent drop occurs during replay, retain unplayed actions
                remaining.push(action);
              }
            }
            if (remaining.length > 0) {
              localStorage.setItem("omnifeed_sync_queue", JSON.stringify(remaining));
              await saveSyncQueueToIndexedDB(remaining);
              setPendingSyncCount(remaining.length);
              setLiveAlert(`Partial connection: ${remaining.length} action(s) retained in queue.`);
            } else {
              localStorage.removeItem("omnifeed_sync_queue");
              await saveSyncQueueToIndexedDB([]);
              setPendingSyncCount(0);
              setLiveAlert("All offline queued actions synchronized successfully!");
            }
            fetchSystemData();
            fetchTopics();
            setLastSyncTime(new Date().toLocaleTimeString());
            setTimeout(() => setLiveAlert(null), 3500);
          }
        } catch (e) {
          console.error("Queue replay error:", e);
        }
      };

      const handleOnline = () => {
        setIsOffline(false);
        replayOfflineQueue();
        triggerIncrementalDeltaSync();
      };
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      try {
        const saved = localStorage.getItem("omnifeed_bookmarks");
        if (saved) {
          setBookmarkedIds(JSON.parse(saved));
        } else {
          getBookmarksFromIndexedDB().then((ids) => {
            if (ids && ids.length > 0) {
              setBookmarkedIds(ids);
              try {
                localStorage.setItem("omnifeed_bookmarks", JSON.stringify(ids));
              } catch (_) {}
            }
          }).catch(() => {});
        }

        // Load bookmark annotations
        const savedNotes = localStorage.getItem("omnifeed_bookmark_annotations");
        if (savedNotes) {
          try {
            setBookmarkAnnotations(JSON.parse(savedNotes));
          } catch (_) {}
        } else {
          getBookmarkAnnotationsFromIndexedDB().then((notes) => {
            if (notes && Object.keys(notes).length > 0) {
              setBookmarkAnnotations(notes);
              try {
                localStorage.setItem("omnifeed_bookmark_annotations", JSON.stringify(notes));
              } catch (_) {}
            }
          }).catch(() => {});
        }
      } catch (_) {
        getBookmarksFromIndexedDB().then((ids) => {
          if (ids && ids.length > 0) setBookmarkedIds(ids);
        }).catch(() => {});
        getBookmarkAnnotationsFromIndexedDB().then((notes) => {
          if (notes) setBookmarkAnnotations(notes);
        }).catch(() => {});
      }

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Listen for messages from service worker (e.g., background sync trigger)
            navigator.serviceWorker.addEventListener("message", (event) => {
              if (event.data?.type === "TRIGGER_QUEUE_REPLAY") {
                replayOfflineQueue();
              } else if (event.data?.type === "BACKGROUND_SYNC_COMPLETED") {
                fetchSystemData();
                fetchTopics();
              }
            });
          })
          .catch((err) => {
            console.warn("Service worker registration failed:", err);
          });
      }
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const triggerIncrementalDeltaSync = async () => {
    if (isSyncingDelta) return;
    setIsSyncingDelta(true);
    const pingStart = Date.now();
    try {
      const lastCheck = localStorage.getItem("omnifeed_last_delta_sync");
      const url = new URL(`${API_BASE}/api/topics/delta`);
      url.searchParams.append("limit", "25");
      if (lastCheck) {
        url.searchParams.append("since", lastCheck);
      }
      const res = await fetch(url.toString());
      setNetworkPingLatency(Date.now() - pingStart);
      if (res.ok) {
        const delta = await res.json();
        if (delta.server_time) {
          localStorage.setItem("omnifeed_last_delta_sync", delta.server_time);
        }
        if (Array.isArray(delta.topics) && delta.topics.length > 0) {
          await saveTopicsToIndexedDB(delta.topics);
          setTopics((prev) => {
            const map = new Map<number, Topic>();
            delta.topics.forEach((t: Topic) => map.set(t.id, t));
            prev.forEach((t) => { if (!map.has(t.id)) map.set(t.id, t); });
            return Array.from(map.values()).slice(0, pageSize);
          });
          setLiveAlert(`Delta Sync: ${delta.topics.length} new or updated topic(s) ingested.`);
          setTimeout(() => setLiveAlert(null), 3000);
        }
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn("Incremental delta sync skipped:", err);
    } finally {
      setIsSyncingDelta(false);
    }
  };

  const toggleBookmark = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const isRemoving = prev.includes(id);
      const updated = isRemoving ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("omnifeed_bookmarks", JSON.stringify(updated));
        saveBookmarksToIndexedDB(updated).catch(() => {});
        if (isRemoving) {
          deleteBookmarkAnnotationFromIndexedDB(id).catch(() => {});
          setBookmarkAnnotations((notes) => {
            const copy = { ...notes };
            delete copy[id];
            try {
              localStorage.setItem("omnifeed_bookmark_annotations", JSON.stringify(copy));
            } catch (_) {}
            return copy;
          });
        }
      } catch (_) {}
      return updated;
    });
  };

  const handleBatchBookmarkVisible = () => {
    const visibleTopics = showOnlyBookmarks
      ? topics.filter((t) => bookmarkedIds.includes(t.id))
      : topics;
    if (visibleTopics.length === 0) return;

    setBookmarkedIds((prev) => {
      const set = new Set(prev);
      visibleTopics.forEach((t) => set.add(t.id));
      const updated = Array.from(set);
      try {
        localStorage.setItem("omnifeed_bookmarks", JSON.stringify(updated));
        saveBookmarksToIndexedDB(updated).catch(() => {});
      } catch (_) {}
      setLiveAlert(`Bookmarked all ${visibleTopics.length} visible topics to offline vault!`);
      return updated;
    });
  };

  const handleBatchUnbookmarkVisible = () => {
    const visibleTopics = showOnlyBookmarks
      ? topics.filter((t) => bookmarkedIds.includes(t.id))
      : topics;
    if (visibleTopics.length === 0) return;

    const visibleIds = new Set(visibleTopics.map((t) => t.id));
    setBookmarkedIds((prev) => {
      const updated = prev.filter((id) => !visibleIds.has(id));
      try {
        localStorage.setItem("omnifeed_bookmarks", JSON.stringify(updated));
        saveBookmarksToIndexedDB(updated).catch(() => {});
        visibleIds.forEach((id) => {
          deleteBookmarkAnnotationFromIndexedDB(id).catch(() => {});
        });
      } catch (_) {}
      setLiveAlert(`Cleared ${visibleTopics.length} visible topics from reading list.`);
      return updated;
    });
  };

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts when typing inside form fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      if (e.key === "Escape") {
        if (selectedTopicId) setSelectedTopicId(null);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else if (showFeedsModal) setShowFeedsModal(false);
        else if (showOfflineModal) setShowOfflineModal(false);
        else if (showExportMenu) setShowExportMenu(false);
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector("input[placeholder*='Search topics']") as HTMLInputElement | null;
        if (searchInput) searchInput.focus();
      } else if (e.key === "j" || e.key === "ArrowRight") {
        e.preventDefault();
        if (topics.length > 0) {
          setFocusedTopicIndex((prev) => {
            const next = prev + 1;
            if (next >= topics.length) {
              if (page < totalPages) setPage((p) => p + 1);
              return 0;
            }
            return next;
          });
        }
      } else if (e.key === "k" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (topics.length > 0) {
          setFocusedTopicIndex((prev) => {
            const prevIndex = prev - 1;
            if (prevIndex < 0) {
              if (page > 1) setPage((p) => p - 1);
              return Math.max(0, topics.length - 1);
            }
            return prevIndex;
          });
        }
      } else if (e.key === "Enter") {
        if (focusedTopicIndex >= 0 && focusedTopicIndex < topics.length && !selectedTopicId) {
          e.preventDefault();
          setSelectedTopicId(topics[focusedTopicIndex].id);
        }
      } else if (e.key === "b" || e.key === "B") {
        if (selectedTopicId) {
          e.preventDefault();
          toggleBookmark(selectedTopicId);
        } else if (focusedTopicIndex >= 0 && focusedTopicIndex < topics.length) {
          e.preventDefault();
          toggleBookmark(topics[focusedTopicIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [topics, page, totalPages, selectedTopicId, focusedTopicIndex, showShortcutsModal, showFeedsModal, showOfflineModal, showExportMenu]);

  const handleSaveAnnotation = async (topicId: number) => {
    const rawTags = annotationTagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter((t) => t.length > 0);
    const annotation: BookmarkAnnotation = {
      topic_id: topicId,
      note: annotationNoteInput.trim(),
      tags: Array.from(new Set(rawTags)),
      updated_at: new Date().toISOString(),
    };
    const updated = { ...bookmarkAnnotations, [topicId]: annotation };
    setBookmarkAnnotations(updated);
    try {
      localStorage.setItem("omnifeed_bookmark_annotations", JSON.stringify(updated));
      await saveBookmarkAnnotationToIndexedDB(annotation);
    } catch (_) {}
    setEditingAnnotationTopicId(null);
    setAnnotationNoteInput("");
    setAnnotationTagsInput("");
    setLiveAlert("Bookmark annotation saved successfully.");
    setTimeout(() => setLiveAlert(null), 3000);
  };

  // Fetch initial telemetry and pulse + resilient live WebSocket connection with exponential backoff
  useEffect(() => {
    fetchSystemData();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let attempts = 0;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      try {
        const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/ws/feed";
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isUnmounted) return;
          setWsConnected(true);
          attempts = 0;
          setWsReconnectAttempts(0);
          try {
            // Request fresh initial snapshot
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: "request_snapshot" }));
            }
          } catch (_) {}
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === "connected" || payload.event === "telemetry_snapshot") {
              if (payload.telemetry) {
                setStatus((prev) => prev ? { ...prev, counts: payload.telemetry } : null);
              }
              if (payload.overall_sentiment !== undefined) {
                setPulse((prev) => prev ? { ...prev, overall_sentiment: payload.overall_sentiment } : null);
              }
              if (Array.isArray(payload.recent_topics) && payload.recent_topics.length > 0) {
                saveTopicsToIndexedDB(payload.recent_topics).catch(() => {});
              }
            } else if (payload.event === "sync_completed" || payload.event === "firehose_pulse") {
              setLiveAlert(payload.message || "New stories ingested & clustered!");
              if (audioAlertsEnabled) playChime();

              // Optimistic instant telemetry update from WebSocket payload
              if (payload.telemetry) {
                setStatus((prev) => prev ? { ...prev, counts: payload.telemetry } : null);
              }
              if (payload.overall_sentiment !== undefined) {
                setPulse((prev) => prev ? { ...prev, overall_sentiment: payload.overall_sentiment } : null);
              }

              // Optimistic topic prepend if recent_topics are provided in delta
              if (Array.isArray(payload.recent_topics) && payload.recent_topics.length > 0) {
                // Keep IndexedDB offline vault fresh with incoming live delta
                saveTopicsToIndexedDB(payload.recent_topics).catch(() => {});

                if (page === 1 && activeCategory === "All" && !searchQuery.trim()) {
                  setTopics((prev) => {
                    const map = new Map<number, Topic>();
                    payload.recent_topics.forEach((t: Topic) => map.set(t.id, t));
                    prev.forEach((t) => { if (!map.has(t.id)) map.set(t.id, t); });
                    return Array.from(map.values()).slice(0, pageSize);
                  });
                }
              } else {
                fetchTopics();
              }

              fetchSystemData();
              setTimeout(() => setLiveAlert(null), 4000);
            }
          } catch (err) {
            console.error("WS parse error:", err);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setWsConnected(false);
          // Exponential backoff: min 1s, doubling up to 16s
          attempts += 1;
          setWsReconnectAttempts(attempts);
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 16000);
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (e) {
        setWsConnected(false);
        attempts += 1;
        setWsReconnectAttempts(attempts);
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 16000);
        reconnectTimeout = setTimeout(connectWebSocket, delay);
      }
    };

    connectWebSocket();

    const interval = setInterval(fetchSystemData, 15000);
    // Periodic incremental delta sync (every 60s) for intermittent connectivity networks
    const deltaInterval = setInterval(() => {
      if (navigator.onLine && !isOffline) {
        triggerIncrementalDeltaSync();
      }
    }, 60000);

    return () => {
      isUnmounted = true;
      clearInterval(interval);
      clearInterval(deltaInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Reset page to 1 when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery, sortBy]);

  // Fetch topics and telemetry whenever category, search, sort, or pagination changes
  useEffect(() => {
    fetchTopics();
    fetchSystemData(activeCategory);
  }, [activeCategory, searchQuery, sortBy, page, pageSize]);

  // Fetch deep-dive modal
  useEffect(() => {
    if (selectedTopicId) {
      fetchTopicDetail(selectedTopicId);
    } else {
      setTopicDetail(null);
    }
  }, [selectedTopicId]);

  const fetchSystemData = async (cat?: string) => {
    try {
      const activeCat = cat || activeCategory;
      const pulseUrl = new URL(`${API_BASE}/api/sentiment/pulse`);
      if (activeCat !== "All") pulseUrl.searchParams.append("category", activeCat);

      const [resStatus, resPulse, resSources] = await Promise.all([
        fetch(`${API_BASE}/api/system/status`),
        fetch(pulseUrl.toString()),
        fetch(`${API_BASE}/api/sources`)
      ]);
      if (resStatus.ok) setStatus(await resStatus.json());
      if (resPulse.ok) setPulse(await resPulse.json());
      if (resSources.ok) {
        const sourcesData = await resSources.json();
        setFeedSources(sourcesData);
        localStorage.setItem("omnifeed_sources_cache", JSON.stringify(sourcesData));
        await saveSourcesToIndexedDB(sourcesData);
      }

      // Check feed health summary
      fetch(`${API_BASE}/api/sources/health-summary`)
        .then((r) => r.ok ? r.json() : null)
        .then((health) => {
          if (health) {
            setFeedHealthSummary({
              total: health.total_sources,
              healthy: health.healthy_count,
              degraded: health.degraded_count,
              unreachable: health.unreachable_count,
              uptimePct: health.uptime_percentage,
              avgLatency: health.average_latency_ms,
            });
            try {
              localStorage.setItem("omnifeed_sources_health_summary", JSON.stringify(health));
            } catch (_) {}
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error("Error fetching status or pulse:", e);
      const idbSources = await getSourcesFromIndexedDB();
      if (idbSources && idbSources.length > 0) {
        setFeedSources(idbSources);
      } else {
        const cached = localStorage.getItem("omnifeed_sources_cache");
        if (cached) {
          try { setFeedSources(JSON.parse(cached)); } catch {}
        }
      }
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedSubmitError(null);
    if (!newFeedName.trim() || !newFeedUrl.trim()) {
      setFeedSubmitError("Please specify both a feed name and a valid URL.");
      return;
    }
    setIsAddingFeed(true);
    try {
      if (isOffline) {
        // Enqueue feed subscription while offline
        const simulatedSource: FeedSource = {
          id: Date.now(),
          name: newFeedName.trim(),
          url: newFeedUrl.trim(),
          type: newFeedType,
          active: true,
          article_count: 0,
        };
        const updated = [...feedSources, simulatedSource];
        setFeedSources(updated);
        localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
        await saveSourcesToIndexedDB(updated);

        const queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
        queue.push({
          type: "add_feed",
          timestamp: new Date().toISOString(),
          payload: {
            name: newFeedName.trim(),
            url: newFeedUrl.trim(),
            type: newFeedType,
          },
        });
        localStorage.setItem("omnifeed_sync_queue", JSON.stringify(queue));
        await saveSyncQueueToIndexedDB(queue);
        setPendingSyncCount(queue.length);
        setNewFeedName("");
        setNewFeedUrl("");
        setLiveAlert("Feed subscription queued for sync once back online.");
        setTimeout(() => setLiveAlert(null), 3000);
      } else {
        const res = await fetch(`${API_BASE}/api/sources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newFeedName.trim(),
            url: newFeedUrl.trim(),
            type: newFeedType,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setFeedSubmitError(err.detail || "Failed to register feed.");
        } else {
          const created = await res.json();
          const updated = [...feedSources.filter((s) => s.id !== created.id), created];
          setFeedSources(updated);
          localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
          await saveSourcesToIndexedDB(updated);
          setNewFeedName("");
          setNewFeedUrl("");
        }
      }
    } catch (e) {
      // If network fails during online attempt, gracefully enqueue
      const queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
      queue.push({
        type: "add_feed",
        timestamp: new Date().toISOString(),
        payload: {
          name: newFeedName.trim(),
          url: newFeedUrl.trim(),
          type: newFeedType,
        },
      });
      localStorage.setItem("omnifeed_sync_queue", JSON.stringify(queue));
      setPendingSyncCount(queue.length);
      setLiveAlert("Network unreachable: Feed queued for background sync.");
      setTimeout(() => setLiveAlert(null), 3000);
    } finally {
      setIsAddingFeed(false);
    }
  };

  const [pingingSourceId, setPingingSourceId] = useState<number | null>(null);

  const handlePingSource = async (id: number) => {
    setPingingSourceId(id);
    try {
      const res = await fetch(`${API_BASE}/api/sources/${id}/ping`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFeedSources((prev) => {
          const updated = prev.map((s) =>
            s.id === id ? { ...s, status: data.status, latency_ms: data.latency_ms } : s
          );
          try {
            localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }
    } catch (e) {
      console.error("Feed ping failed:", e);
      setFeedSources((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, status: "unreachable" } : s));
        try {
          localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });
    } finally {
      setPingingSourceId(null);
    }
  };

  const handleDeleteFeed = async (id: number) => {
    if (!confirm("Are you sure you want to unsubscribe from this feed source?")) return;
    try {
      if (isOffline) {
        const updated = feedSources.filter(s => s.id !== id);
        setFeedSources(updated);
        localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
        await saveSourcesToIndexedDB(updated);

        const queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
        queue.push({
          type: "delete_feed",
          timestamp: new Date().toISOString(),
          source_id: id,
        });
        localStorage.setItem("omnifeed_sync_queue", JSON.stringify(queue));
        await saveSyncQueueToIndexedDB(queue);
        setPendingSyncCount(queue.length);
        setLiveAlert("Feed removal queued for sync once back online.");
        setTimeout(() => setLiveAlert(null), 3000);
      } else {
        const res = await fetch(`${API_BASE}/api/sources/${id}`, { method: "DELETE" });
        if (res.ok) {
          const updated = feedSources.filter(s => s.id !== id);
          setFeedSources(updated);
          localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
          await saveSourcesToIndexedDB(updated);
        }
      }
    } catch (e) {
      console.error("Failed to delete feed:", e);
    }
  };

  const fetchTopics = async () => {
    setLoading(true);
    try {
      // If client is already offline, immediately bypass network and serve from IndexedDB/localStorage
      if (isOffline) {
        throw new Error("Offline mode active");
      }

      const url = new URL(`${API_BASE}/api/topics`);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("page_size", pageSize.toString());
      url.searchParams.append("sort_by", sortBy);
      if (activeCategory !== "All") url.searchParams.append("category", activeCategory);
      if (searchQuery.trim()) url.searchParams.append("q", searchQuery.trim());

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.offline) {
          // Service worker returned offline fallback token
          throw new Error("Service worker reported offline");
        }
        // Support both paginated object and legacy array format
        if (data.items) {
          setTopics(data.items);
          setTotalTopics(data.total);
          setTotalPages(data.total_pages);
          try {
            localStorage.setItem("omnifeed_cached_topics", JSON.stringify(data));
            await saveTopicsToIndexedDB(data.items);
          } catch (_) {}
        } else if (Array.isArray(data)) {
          setTopics(data);
          setTotalTopics(data.length);
          setTotalPages(1);
          try {
            localStorage.setItem("omnifeed_cached_topics", JSON.stringify({ items: data, total: data.length, total_pages: 1 }));
            await saveTopicsToIndexedDB(data);
          } catch (_) {}
        }
      }
    } catch (e) {
      // Seamless offline recovery: load cached topics from IndexedDB / localStorage with client-side filtering
      try {
        let pool: Topic[] = [];
        const idbTopics = await getTopicsFromIndexedDB();
        if (idbTopics && idbTopics.length > 0) {
          pool = idbTopics;
        } else {
          const cached = localStorage.getItem("omnifeed_cached_topics");
          if (cached) {
            const parsed = JSON.parse(cached);
            pool = parsed.items || (Array.isArray(parsed) ? parsed : []);
          }
        }

        // Apply offline category filter
        let filtered = pool;
        if (activeCategory !== "All") {
          filtered = filtered.filter(
            (t) => t.category && t.category.toLowerCase() === activeCategory.toLowerCase()
          );
        }

        // Apply offline search query filter (matching topic title, summary, custom notes, and tags)
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          filtered = filtered.filter((t) => {
            const matchTitle = t.title && t.title.toLowerCase().includes(q);
            const matchSummary = t.summary && t.summary.toLowerCase().includes(q);
            const noteObj = bookmarkAnnotations[t.id];
            const matchNote = noteObj?.note && noteObj.note.toLowerCase().includes(q);
            const matchTag = noteObj?.tags && noteObj.tags.some((tag) => tag.toLowerCase().includes(q.replace(/^#/, "")));
            return matchTitle || matchSummary || matchNote || matchTag;
          });
        }

        // Apply offline sorting
        if (sortBy === "articles") {
          filtered.sort((a, b) => (b.article_count || 0) - (a.article_count || 0));
        } else if (sortBy === "controversy") {
          filtered.sort((a, b) => (b.controversy_score || 0) - (a.controversy_score || 0));
        } else if (sortBy === "sentiment") {
          filtered.sort((a, b) => Math.abs(b.sentiment_score || 0) - Math.abs(a.sentiment_score || 0));
        } else {
          filtered.sort((a, b) => (b.last_updated || "").localeCompare(a.last_updated || ""));
        }

        const total = filtered.length;
        const totalP = Math.max(1, Math.ceil(total / pageSize));
        const offset = (page - 1) * pageSize;
        const paginated = filtered.slice(offset, offset + pageSize);

        setTopics(paginated);
        setTotalTopics(total);
        setTotalPages(totalP);
      } catch (err) {
        console.error("Offline recovery error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/topics/${id}`);
      if (res.ok) {
        const detailData = await res.json();
        setTopicDetail(detailData);
        try {
          localStorage.setItem(`omnifeed_topic_detail_${id}`, JSON.stringify(detailData));
          await saveTopicDetailToIndexedDB(id, detailData);
        } catch (_) {}
      } else {
        // Fall back to localStorage or IndexedDB cache if network request fails
        const cachedDetail = localStorage.getItem(`omnifeed_topic_detail_${id}`);
        if (cachedDetail) {
          setTopicDetail(JSON.parse(cachedDetail));
        } else {
          const idbDetail = await getTopicDetailFromIndexedDB(id);
          if (idbDetail) setTopicDetail(idbDetail);
        }
      }
    } catch (e) {
      console.error("Error fetching topic detail:", e);
      // Offline fallback: load cached topic detail from localStorage, then IndexedDB
      try {
        const cachedDetail = localStorage.getItem(`omnifeed_topic_detail_${id}`);
        if (cachedDetail) {
          setTopicDetail(JSON.parse(cachedDetail));
        } else {
          const idbDetail = await getTopicDetailFromIndexedDB(id);
          if (idbDetail) setTopicDetail(idbDetail);
        }
      } catch (_) {}
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (isOffline) {
        // Queue action for offline replay
        const queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
        queue.push({ type: "sync_feeds", timestamp: new Date().toISOString() });
        localStorage.setItem("omnifeed_sync_queue", JSON.stringify(queue));
        await saveSyncQueueToIndexedDB(queue);
        setPendingSyncCount(queue.length);

        // Register Background Sync if supported
        if ("serviceWorker" in navigator && "SyncManager" in window) {
          navigator.serviceWorker.ready.then((reg: any) => {
            if (reg.sync) {
              reg.sync.register("sync-omnifeed-queue").catch(() => {});
            }
          }).catch(() => {});
        }

        setLiveAlert("Offline: Ingestion sync queued to execute once back online.");
        setTimeout(() => setLiveAlert(null), 3000);
      } else {
        await fetch(`${API_BASE}/api/actions/sync`, { method: "POST" });
        await fetchSystemData();
        await fetchTopics();
      }
    } catch (e) {
      console.error("Sync error:", e);
      const queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
      queue.push({ type: "sync_feeds", timestamp: new Date().toISOString() });
      localStorage.setItem("omnifeed_sync_queue", JSON.stringify(queue));
      setPendingSyncCount(queue.length);
      setLiveAlert("Network failure: Ingestion sync queued for background retry.");
      setTimeout(() => setLiveAlert(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFirehosePulse = async () => {
    setIsFirehosing(true);
    try {
      await fetch(`${API_BASE}/api/firehose/simulate`, { method: "POST" });
      await fetchSystemData();
      await fetchTopics();
    } catch (e) {
      console.error("Firehose error:", e);
    } finally {
      setIsFirehosing(false);
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

  const handleSummarize = async () => {
    if (!selectedTopicId) return;
    setIsSummarizing(true);
    try {
      const res = await fetch(`${API_BASE}/api/topics/${selectedTopicId}/summarize`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (topicDetail) {
          const updated = {
            ...topicDetail,
            topic: {
              ...topicDetail.topic,
              summary: data.summary,
            },
          };
          setTopicDetail(updated);
          await saveTopicDetailToIndexedDB(selectedTopicId, updated).catch(() => {});
        }
      } else {
        throw new Error("Backend summarization unavailable");
      }
    } catch (e) {
      console.warn("Summarization offline fallback triggered:", e);
      // Offline fallback: synthesize bullet briefing directly from cached topic and articles
      if (topicDetail) {
        const t = topicDetail.topic;
        const arts = topicDetail.articles || [];
        const bullets: string[] = [];
        if (t.title) bullets.push(`- Key event: ${t.title}`);
        if (t.summary && t.summary !== t.title) bullets.push(`- Overview: ${t.summary}`);
        if (arts.length > 0) {
          const sources = Array.from(new Set(arts.map((a) => a.source_name || "Feed source"))).slice(0, 3);
          bullets.push(`- Corroborated across ${arts.length} publications including ${sources.join(", ")}`);
        }
        if (t.entities && t.entities.length > 0) {
          bullets.push(`- Associated entities: ${t.entities.slice(0, 5).join(", ")}`);
        }
        bullets.push(`- [Offline Intelligence Synthesis @ ${new Date().toLocaleTimeString()}]`);

        const offlineSummary = bullets.join("\n");
        const updated = {
          ...topicDetail,
          topic: {
            ...topicDetail.topic,
            summary: offlineSummary,
          },
        };
        setTopicDetail(updated);
        await saveTopicDetailToIndexedDB(selectedTopicId, updated).catch(() => {});
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExport = (format: "json" | "csv", includeArticles: boolean = false) => {
    setShowExportMenu(false);
    const url = new URL(`${API_BASE}/api/topics/export`);
    url.searchParams.append("format", format);
    url.searchParams.append("sort_by", sortBy);
    if (activeCategory !== "All") url.searchParams.append("category", activeCategory);
    if (searchQuery.trim()) url.searchParams.append("q", searchQuery.trim());
    if (includeArticles) url.searchParams.append("include_articles", "true");
    window.open(url.toString(), "_blank");
  };

  const handleExportBookmarks = (format: "markdown" | "json") => {
    setShowExportMenu(false);
    const saved = topics.filter((t) => bookmarkedIds.includes(t.id));
    if (saved.length === 0) {
      alert("No bookmarked topics to export. Star a topic first!");
      return;
    }

    if (format === "json") {
      const enriched = saved.map((t) => ({
        ...t,
        annotation: bookmarkAnnotations[t.id] || null,
      }));
      const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: "application/json" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `omnifeed_bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    } else {
      let md = `# Omnifeed Intelligence Reading List\n\n*Generated on: ${new Date().toUTCString()}*\n\n`;
      saved.forEach((t, i) => {
        const anno = bookmarkAnnotations[t.id];
        md += `### ${i + 1}. [${t.category?.toUpperCase() || "GENERAL"}] ${t.title}\n\n`;
        md += `> ${t.summary}\n\n`;
        md += `- **Articles correlated**: ${t.article_count}\n`;
        md += `- **Last updated**: ${t.last_updated || "N/A"}\n`;
        if (anno && anno.note) {
          md += `- **Note**: ${anno.note}\n`;
        }
        if (anno && anno.tags && anno.tags.length > 0) {
          md += `- **Tags**: ${anno.tags.map((tg) => `#${tg}`).join(" ")}\n`;
        }
        md += `\n---\n\n`;
      });
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `omnifeed_bookmarks_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    }
  };

  return (
    <div className={`min-h-screen ${oledMode ? "bg-black text-neutral-100" : "bg-slate-950 text-slate-100"} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Universal Navbar */}
      <header className={`border-b ${oledMode ? "border-neutral-800 bg-black/90" : "border-slate-800 bg-slate-900/90"} backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black tracking-wider text-cyan-400">OMNIFEED</span>
            <span className="text-xs uppercase px-2 py-0.5 font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
              v{status?.version || "0.6.0"}
            </span>
            <span
              title={`Runtime environment: ${platformName} mode (Offline Cache & Sync Queue Active)`}
              className="text-[10px] uppercase px-1.5 py-0.5 font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded flex items-center space-x-1"
            >
              <span className="text-cyan-400">●</span>
              <span>{platformName}</span>
            </span>
          </div>
          <span className="text-xs text-slate-400 border-l border-slate-700 pl-4 hidden md:inline">
            Aggregated Cross-Source Intelligence Engine
          </span>
        </div>

        {/* Global Controls & Status Indicators */}
        <div className="flex items-center space-x-3">
          {/* Real-time Network Latency & Sync Pulse */}
          <div
            title={
              isOffline
                ? "Network Disconnected: Local offline cache and queue active"
                : `Network Active: ${networkPingLatency !== null ? `${networkPingLatency}ms latency` : "Connected"} (Last Sync: ${lastSyncTime || "Just now"})`
            }
            className="flex items-center space-x-1.5 text-xs bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/80 cursor-help"
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isOffline
                  ? "bg-rose-500"
                  : wsConnected
                  ? "bg-emerald-400 animate-pulse"
                  : wsReconnectAttempts > 0
                  ? "bg-amber-400 animate-ping"
                  : "bg-cyan-400"
              }`}
            />
            <span className="text-slate-300 font-medium hidden sm:inline">
              {isOffline
                ? "Offline"
                : wsConnected
                ? "Live WS"
                : wsReconnectAttempts > 0
                ? `Reconnecting (${wsReconnectAttempts})`
                : "Polling"}
            </span>
            {networkPingLatency !== null && !isOffline && (
              <span className="text-[10px] text-cyan-300 font-mono hidden md:inline">
                {networkPingLatency}ms
              </span>
            )}
          </div>

          {/* Manual Incremental Delta Sync Button */}
          <button
            onClick={triggerIncrementalDeltaSync}
            disabled={isSyncingDelta || isOffline}
            title="Perform lightweight delta synchronization for new/updated topics over low-bandwidth or intermittent connections"
            className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-cyan-300 transition flex items-center space-x-1 disabled:opacity-40"
          >
            <span>{isSyncingDelta ? "🔄 Syncing..." : "🔄 Delta"}</span>
          </button>

          {/* Autopilot Ingestion Toggle */}
          <button
            onClick={async () => {
              const nextState = !autopilotEnabled;
              setAutopilotEnabled(nextState);
              try {
                await fetch(`${API_BASE}/api/settings/autopilot`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enabled: nextState, interval_seconds: 60 }),
                });
                setLiveAlert(nextState ? "Autopilot automated background ingestion enabled." : "Autopilot paused.");
                setTimeout(() => setLiveAlert(null), 3000);
              } catch (_) {}
            }}
            title={autopilotEnabled ? "Autopilot Active: Background ingestion and clustering running automatically" : "Enable Autopilot: Automatically ingest feeds and stream deltas"}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded border transition flex items-center space-x-1.5 ${
              autopilotEnabled
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${autopilotEnabled ? "bg-cyan-400 animate-ping" : "bg-slate-500"}`} />
            <span>{autopilotEnabled ? "⚡ Autopilot On" : "⚡ Autopilot"}</span>
          </button>

          {/* Audio Chime Alert Toggle */}
          <button
            onClick={() => {
              const nextState = !audioAlertsEnabled;
              setAudioAlertsEnabled(nextState);
              if (nextState) playChime();
            }}
            title={audioAlertsEnabled ? "Audio chimes enabled for breaking news events" : "Enable audio chimes for breaking news events"}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded border transition ${
              audioAlertsEnabled
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {audioAlertsEnabled ? "🔔 Audio On" : "🔕 Audio"}
          </button>

          {/* Manage Feeds Button with Health Indicator */}
          <button
            onClick={() => setShowFeedsModal(true)}
            title={`Manage RSS/Atom feeds (${feedSources.length} active)${feedHealthSummary ? ` - Uptime: ${feedHealthSummary.uptimePct}%` : ""}`}
            className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1"
          >
            <span>📡 Feeds</span>
            {feedSources.length > 0 && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                {feedSources.length}
              </span>
            )}
            {feedHealthSummary && feedHealthSummary.unreachable > 0 && (
              <span
                title={`${feedHealthSummary.unreachable} feed(s) unreachable or degraded`}
                className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold"
              >
                ⚠️ {feedHealthSummary.unreachable}
              </span>
            )}
          </button>

          {/* Offline Cache Manager Button */}
          <button
            onClick={async () => {
              const [metrics, quota] = await Promise.all([
                getOfflineStorageMetrics(),
                getStorageQuotaEstimate(),
              ]);
              setOfflineMetrics(metrics);
              setStorageQuota(quota);
              setShowOfflineModal(true);
            }}
            title="Manage IndexedDB and LocalStorage offline caches and backup offline intelligence archive"
            className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-cyan-300 transition flex items-center space-x-1"
          >
            <span>💾 Cache</span>
            {offlineMetrics.topicCount > 0 && (
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded-full font-bold">
                {offlineMetrics.topicCount}
              </span>
            )}
          </button>

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
              <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs divide-y divide-slate-800">
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Feed Topics</div>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition"
                  >
                    Export All (JSON)
                  </button>
                  <button
                    onClick={() => handleExport("json", true)}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition"
                    title="Includes correlated article citations and text excerpts in JSON export"
                  >
                    Export with Articles (JSON)
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition"
                  >
                    Export All (CSV)
                  </button>
                </div>
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-amber-500 uppercase tracking-wider">★ Reading List</div>
                  <button
                    onClick={() => handleExportBookmarks("markdown")}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition"
                  >
                    Export Bookmarks (MD)
                  </button>
                  <button
                    onClick={() => handleExportBookmarks("json")}
                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition"
                  >
                    Export Bookmarks (JSON)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleFirehosePulse}
            disabled={isFirehosing}
            title="Stream real-time micro-commentary from Bluesky AT Protocol & Mastodon"
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition shadow disabled:opacity-50"
          >
            <span>{isFirehosing ? "🌊 Firehose Pulsing..." : "🌊 Stream Firehose"}</span>
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            title={
              isOffline
                ? "Offline mode: Queues ingestion sync request to execute immediately when connectivity is restored"
                : "Fetch breaking stories from all sources and update clusters"
            }
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition shadow disabled:opacity-50 relative"
          >
            <span>{isSyncing ? "⚡ Syncing Feeds..." : isOffline ? "⚡ Queue Sync" : "⚡ Sync Ingestion"}</span>
            {pendingSyncCount > 0 && (
              <span
                title={`${pendingSyncCount} action(s) queued for replay upon reconnection`}
                className="ml-1 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-bounce"
              >
                {pendingSyncCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            title="View keyboard shortcut controls (?)"
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition flex items-center space-x-1"
          >
            <span>⌨️</span>
            <span className="hidden sm:inline">Keys</span>
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

      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-slate-950 text-xs font-bold px-4 py-1.5 text-center shadow transition-all">
          📡 Offline Mode: Displaying cached intelligence feeds from local service worker cache.
        </div>
      )}

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
          {/* Real-time Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, headlines, or keywords..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort topics by recency, coverage density, controversy, or polarity"
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="latest">Sort: 🕒 Recent</option>
              <option value="articles">Sort: 📈 Most Active</option>
              <option value="controversy">Sort: 🔥 Controversy</option>
              <option value="sentiment">Sort: ⚡ Polarity</option>
            </select>
          </div>

          {/* Category Tabs & Bookmarks */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => {
                setShowOnlyBookmarks(!showOnlyBookmarks);
                if (showOnlyBookmarks) setActiveBookmarkTagFilter(null);
              }}
              title="Filter to bookmarked topics stored in local client memory"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center space-x-1 border ${
                showOnlyBookmarks
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : "bg-slate-800/80 text-amber-400 border-slate-700 hover:bg-slate-800"
              }`}
            >
              <span>★ Bookmarks</span>
              <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-900/40">{bookmarkedIds.length}</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  activeCategory === cat
                    ? showOnlyBookmarks
                      ? "bg-amber-600 text-white"
                      : "bg-cyan-600 text-white"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Bookmark Tags Bar when Bookmarks active */}
          {showOnlyBookmarks && (
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 px-1 bg-amber-950/20 border border-amber-900/30 rounded-lg text-xs">
              <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider pl-1">
                Filter Tags:
              </span>
              <button
                type="button"
                onClick={() => setActiveBookmarkTagFilter(null)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  activeBookmarkTagFilter === null
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-amber-300 hover:bg-amber-950/40"
                }`}
              >
                All Tags
              </button>
              {Array.from(
                new Set(
                  Object.values(bookmarkAnnotations).flatMap((a) => a.tags || [])
                )
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setActiveBookmarkTagFilter(activeBookmarkTagFilter === tag ? null : tag)
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center space-x-1 ${
                    activeBookmarkTagFilter === tag
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50"
                  }`}
                >
                  <span>#{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Clustered Topics Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-200 flex items-center space-x-2">
                <span>Dynamic Clustered Topics</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {totalTopics} total
                </span>
              </h2>

              {topics.length > 0 && (
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <button
                    onClick={handleBatchBookmarkVisible}
                    title="Bookmark all visible topic clusters on this page for offline vault access"
                    className="px-2 py-0.5 bg-amber-950/40 text-amber-300 border border-amber-800/60 rounded hover:bg-amber-900/60 transition flex items-center space-x-1"
                  >
                    <span>★</span>
                    <span>Bookmark Visible</span>
                  </button>
                  <button
                    onClick={handleBatchUnbookmarkVisible}
                    title="Remove visible topic clusters on this page from bookmarks"
                    className="px-2 py-0.5 bg-slate-800/60 text-slate-400 border border-slate-700 rounded hover:bg-slate-700/60 hover:text-slate-200 transition"
                  >
                    <span>☆ Clear</span>
                  </button>
                </div>
              )}
            </div>

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
          ) : (showOnlyBookmarks
                ? topics.filter((t) => {
                    if (!bookmarkedIds.includes(t.id)) return false;
                    if (activeCategory !== "All" && (t.category || "").toLowerCase() !== activeCategory.toLowerCase()) return false;
                    if (activeBookmarkTagFilter) {
                      const tags = bookmarkAnnotations[t.id]?.tags || [];
                      if (!tags.includes(activeBookmarkTagFilter)) return false;
                    }
                    if (searchQuery.trim()) {
                      const q = searchQuery.trim().toLowerCase();
                      const matchTitle = t.title && t.title.toLowerCase().includes(q);
                      const matchSummary = t.summary && t.summary.toLowerCase().includes(q);
                      const noteObj = bookmarkAnnotations[t.id];
                      const matchNote = noteObj?.note && noteObj.note.toLowerCase().includes(q);
                      const matchTag = noteObj?.tags && noteObj.tags.some((tag) => tag.toLowerCase().includes(q.replace(/^#/, "")));
                      if (!matchTitle && !matchSummary && !matchNote && !matchTag) return false;
                    }
                    return true;
                  })
                : topics
              ).length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              {showOnlyBookmarks
                ? `No bookmarked topics found matching current filters (${activeCategory}${activeBookmarkTagFilter ? `, #${activeBookmarkTagFilter}` : ""}). Bookmark topics to read offline anytime!`
                : "No matching topic clusters found. Try hitting ⚡ Sync Ingestion."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(showOnlyBookmarks
                ? topics.filter((t) => {
                    if (!bookmarkedIds.includes(t.id)) return false;
                    if (activeCategory !== "All" && (t.category || "").toLowerCase() !== activeCategory.toLowerCase()) return false;
                    if (activeBookmarkTagFilter) {
                      const tags = bookmarkAnnotations[t.id]?.tags || [];
                      if (!tags.includes(activeBookmarkTagFilter)) return false;
                    }
                    return true;
                  })
                : topics
              ).map((t, idx) => {
                const isBookmarked = bookmarkedIds.includes(t.id);
                const isFocused = idx === focusedTopicIndex;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setFocusedTopicIndex(idx);
                      setSelectedTopicId(t.id);
                    }}
                    className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between transition cursor-pointer group shadow-sm relative ${
                      isFocused
                        ? "border-cyan-400 ring-2 ring-cyan-500/60 shadow-cyan-950/50"
                        : "border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-950/20"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                            {t.category || "General"}
                          </span>
                          {t.is_breaking && (
                            <span
                              title={`High controversy / high-velocity topic (controversy: ${t.controversy_score})`}
                              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/80 animate-pulse flex items-center space-x-1"
                            >
                              <span>🔥</span>
                              <span>Breaking</span>
                            </span>
                          )}
                          {isOffline && (
                            <span
                              title="Full story cluster & articles cached in offline vault"
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60"
                            >
                              💾 Cached
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => toggleBookmark(t.id, e)}
                            title={isBookmarked ? "Remove bookmark" : "Bookmark topic for offline reading"}
                            className={`text-xs px-1.5 py-0.5 rounded border transition ${
                              isBookmarked
                                ? "bg-amber-950/80 text-amber-300 border-amber-700/80"
                                : "text-slate-500 hover:text-amber-400 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            {isBookmarked ? "★" : "☆"}
                          </button>
                          <span className="text-[11px] text-slate-500">
                            {t.article_count} {t.article_count === 1 ? "source" : "sources"}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-semibold text-slate-100 text-sm group-hover:text-cyan-300 transition line-clamp-2">
                        {t.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {t.summary}
                      </p>

                      {/* Bookmark Annotation Note & Tags badge */}
                      {isBookmarked && bookmarkAnnotations[t.id] && (
                        <div className="pt-1.5 space-y-1">
                          {bookmarkAnnotations[t.id].note && (
                            <p className="text-[11px] text-amber-200/90 italic bg-amber-950/40 px-2 py-1 rounded border border-amber-900/40 line-clamp-2">
                              📝 {bookmarkAnnotations[t.id].note}
                            </p>
                          )}
                          {bookmarkAnnotations[t.id].tags && bookmarkAnnotations[t.id].tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {bookmarkAnnotations[t.id].tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] font-semibold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <span>Deep-dive cluster →</span>
                      <span>{t.last_updated ? new Date(t.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}</span>
                    </div>
                  </div>
                );
              })}
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
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {topicDetail.topic.category}
                    </span>
                    <button
                      onClick={() => toggleBookmark(topicDetail.topic.id)}
                      className={`text-xs px-2.5 py-0.5 rounded border transition flex items-center space-x-1 ${
                        bookmarkedIds.includes(topicDetail.topic.id)
                          ? "bg-amber-950 text-amber-300 border-amber-700 font-semibold"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-400"
                      }`}
                    >
                      <span>{bookmarkedIds.includes(topicDetail.topic.id) ? "★ Bookmarked" : "☆ Bookmark Topic"}</span>
                    </button>
                    {bookmarkedIds.includes(topicDetail.topic.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = bookmarkAnnotations[topicDetail.topic.id];
                          setEditingAnnotationTopicId(
                            editingAnnotationTopicId === topicDetail.topic.id ? null : topicDetail.topic.id
                          );
                          setAnnotationNoteInput(current?.note || "");
                          setAnnotationTagsInput((current?.tags || []).join(", "));
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/60 transition"
                      >
                        📝 {bookmarkAnnotations[topicDetail.topic.id] ? "Edit Note / Tags" : "Add Note / Tags"}
                      </button>
                    )}
                  </div>

                  {/* Bookmark Annotation Editor */}
                  {bookmarkedIds.includes(topicDetail.topic.id) && (
                    editingAnnotationTopicId === topicDetail.topic.id ? (
                      <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 space-y-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Edit Bookmark Annotation
                        </span>
                        <textarea
                          placeholder="Private notes, insights, follow-up items..."
                          value={annotationNoteInput}
                          onChange={(e) => setAnnotationNoteInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          rows={2}
                        />
                        <input
                          type="text"
                          placeholder="Tags separated by commas (e.g. urgent, market-shift, tech-radar)"
                          value={annotationTagsInput}
                          onChange={(e) => setAnnotationTagsInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingAnnotationTopicId(null)}
                            className="px-2 py-1 text-[11px] text-slate-400 hover:text-white transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAnnotation(topicDetail.topic.id)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition"
                          >
                            Save Annotation
                          </button>
                        </div>
                      </div>
                    ) : bookmarkAnnotations[topicDetail.topic.id] && (
                      <div className="bg-amber-950/15 border border-amber-900/30 rounded-lg p-2.5 space-y-1 mt-2">
                        {bookmarkAnnotations[topicDetail.topic.id].note && (
                          <p className="text-xs text-amber-200 leading-relaxed italic">
                            📝 {bookmarkAnnotations[topicDetail.topic.id].note}
                          </p>
                        )}
                        {bookmarkAnnotations[topicDetail.topic.id].tags && bookmarkAnnotations[topicDetail.topic.id].tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {bookmarkAnnotations[topicDetail.topic.id].tags.map((tg) => (
                              <span key={tg} className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                                #{tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                  <h2 className="text-lg font-bold text-slate-100">
                    {topicDetail.topic.title}
                  </h2>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                        ✨ Synthesized Intelligence
                      </span>
                      <button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 rounded transition disabled:opacity-50"
                      >
                        {isSummarizing ? "Synthesizing..." : "⚡ Refresh AI Summary"}
                      </button>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono">
                      {topicDetail.topic.summary}
                    </div>
                  </div>
                </div>

                {/* Extracted Named Entities */}
                {topicDetail.topic.entities && topicDetail.topic.entities.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Key Extracted Entities ({topicDetail.topic.entities.length})
                      </h4>
                      {selectedEntityFilter && (
                        <button
                          type="button"
                          onClick={() => setSelectedEntityFilter(null)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 transition"
                        >
                          Clear Entity Filter ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topicDetail.topic.entities.map((ent, idx) => {
                        const isSelected = selectedEntityFilter === ent;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedEntityFilter(isSelected ? null : ent)}
                            title={`Filter articles citing ${ent}`}
                            className={`px-2 py-0.5 rounded text-xs font-medium border transition flex items-center space-x-1 ${
                              isSelected
                                ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                                : "bg-slate-800 text-cyan-300 border-slate-700 hover:border-cyan-500"
                            }`}
                          >
                            <span>👤</span>
                            <span>{ent}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Narrative Evolution Timeline */}
                {topicDetail.topic.timeline && topicDetail.topic.timeline.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Narrative Evolution Timeline
                      </h4>
                      <div className="flex items-center space-x-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setTimelineOrder(timelineOrder === "asc" ? "desc" : "asc")}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                        >
                          {timelineOrder === "asc" ? "Oldest First ↑" : "Newest First ↓"}
                        </button>
                        <select
                          value={timelinePolarityFilter}
                          onChange={(e) => setTimelinePolarityFilter(e.target.value as "all" | "positive" | "negative")}
                          className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 focus:outline-none"
                        >
                          <option value="all">All Sentiment</option>
                          <option value="positive">+ Positive</option>
                          <option value="negative">- Negative</option>
                        </select>
                      </div>
                    </div>
                    <div className="relative border-l border-cyan-800/60 ml-2 pl-4 space-y-3">
                      {[...topicDetail.topic.timeline]
                        .filter((event) => {
                          if (timelinePolarityFilter === "positive") return (event.polarity || 0) > 0.05;
                          if (timelinePolarityFilter === "negative") return (event.polarity || 0) < -0.05;
                          return true;
                        })
                        .sort((a, b) => {
                          const timeA = new Date(a.timestamp || 0).getTime();
                          const timeB = new Date(b.timestamp || 0).getTime();
                          return timelineOrder === "asc" ? timeA - timeB : timeB - timeA;
                        })
                        .map((event, idx) => (
                          <div key={idx} className="relative group">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 group-hover:scale-125 transition" />
                            <div className="text-xs flex items-center space-x-2">
                              <span className="text-cyan-400 font-semibold">{event.source}</span>
                              {event.source_type && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                                  {event.source_type}
                                </span>
                              )}
                              {event.polarity !== undefined && (
                                <span className={`text-[10px] font-bold ${event.polarity > 0 ? "text-emerald-400" : event.polarity < 0 ? "text-rose-400" : "text-slate-400"}`}>
                                  {event.polarity > 0 ? "+" : ""}{Math.round(event.polarity * 100)}%
                                </span>
                              )}
                              <span className="text-slate-500">
                                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}
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
                    Correlated Source Articles ({
                      selectedEntityFilter
                        ? topicDetail.articles.filter((a) => a.title.toLowerCase().includes(selectedEntityFilter.toLowerCase())).length
                        : topicDetail.articles.length
                    })
                    {selectedEntityFilter && <span className="text-cyan-400 font-normal lowercase ml-1.5">(mentioning {selectedEntityFilter})</span>}
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {topicDetail.articles
                      .filter((art) => {
                        if (!selectedEntityFilter) return true;
                        return art.title.toLowerCase().includes(selectedEntityFilter.toLowerCase());
                      })
                      .map((art) => (
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

      {/* Offline Storage & Cache Manager Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-800/80 rounded-xl p-6 shadow-2xl space-y-6">
            <button
              onClick={() => setShowOfflineModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>

            <div>
              <h2 className="text-xl font-bold text-cyan-400 flex items-center space-x-2">
                <span>💾 Offline Intelligence Storage</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Omnifeed uses IndexedDB & Service Worker caches to provide seamless offline intelligence across Desktop, PWA, and Web.
              </p>
            </div>

            {/* Storage telemetry metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cached Topics</span>
                <p className="text-xl font-bold text-cyan-300 mt-1">{offlineMetrics.topicCount}</p>
                <span className="text-[10px] text-slate-500">In IndexedDB store</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cached Details</span>
                <p className="text-xl font-bold text-emerald-400 mt-1">{offlineMetrics.detailCount}</p>
                <span className="text-[10px] text-slate-500">Deep-dive stories</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saved Feeds</span>
                <p className="text-xl font-bold text-purple-400 mt-1">{offlineMetrics.sourceCount || 0}</p>
                <span className="text-[10px] text-slate-500">Offline channels</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estimated Footprint</span>
                <p className="text-xl font-bold text-amber-300 mt-1">
                  {(offlineMetrics.estimatedBytes / 1024).toFixed(1)} KB
                </p>
                <span className="text-[10px] text-slate-500">Persistent disk storage</span>
              </div>
            </div>

            {/* Browser Storage Quota Telemetry */}
            {storageQuota.quotaBytes > 0 && (
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1.5">
                    <span>📊 Storage Quota Governance</span>
                    <span className="text-[9px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
                      {storageQuota.percentUsed.toFixed(1)}% used
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {(storageQuota.usageBytes / (1024 * 1024)).toFixed(1)} MB used of {(storageQuota.quotaBytes / (1024 * 1024)).toFixed(0)} MB allocated quota
                  </div>
                </div>
                <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, storageQuota.percentUsed))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Offline actions */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    const idbTopics = await getTopicsFromIndexedDB();
                    const idbBookmarks = await getBookmarksFromIndexedDB();
                    const idbSources = await getSourcesFromIndexedDB();
                    const idbNotes = await getBookmarkAnnotationsFromIndexedDB();
                    const idbQueue = await getSyncQueueFromIndexedDB();
                    const bookmarksToSave = idbBookmarks.length > 0 ? idbBookmarks : bookmarkedIds;
                    const sourcesToSave = idbSources.length > 0 ? idbSources : feedSources;
                    const notesList = Object.values(idbNotes).length > 0 ? Object.values(idbNotes) : Object.values(bookmarkAnnotations);
                    const queueToSave = idbQueue.length > 0 ? idbQueue : JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
                    const blob = new Blob(
                      [
                        JSON.stringify(
                          {
                            exported_at: new Date().toISOString(),
                            topics: idbTopics,
                            bookmarks: bookmarksToSave,
                            sources: sourcesToSave,
                            annotations: notesList,
                            syncQueue: queueToSave,
                          },
                          null,
                          2
                        ),
                      ],
                      {
                        type: "application/json",
                      }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `omnifeed_offline_vault_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-2 text-xs font-semibold bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 rounded transition flex items-center space-x-1.5"
                >
                  <span>📦 Export Offline Vault</span>
                </button>

                <button
                  onClick={async () => {
                    const result = await compactOfflineVault(30);
                    const [m, q] = await Promise.all([
                      getOfflineStorageMetrics(),
                      getStorageQuotaEstimate(),
                    ]);
                    setOfflineMetrics(m);
                    setStorageQuota(q);
                    setLiveAlert(`🗜️ Compacted vault: pruned ${result.detailsPruned} unbookmarked detail caches (${result.remainingDetails} preserved)`);
                    setTimeout(() => setLiveAlert(null), 3500);
                  }}
                  title="Prunes oldest unbookmarked story details while strictly preserving all bookmarked topics, custom notes, and pending offline sync actions"
                  className="px-3 py-2 text-xs font-semibold bg-amber-950/40 hover:bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded transition flex items-center space-x-1.5"
                >
                  <span>🗜️ Compact Vault</span>
                </button>

                <button
                  onClick={async () => {
                    if (confirm("Purge IndexedDB and LocalStorage offline caches? Fresh data will be cached on subsequent requests.")) {
                      await clearOfflineIndexedDB();
                      localStorage.removeItem("omnifeed_cached_topics");
                      const [m, q] = await Promise.all([
                        getOfflineStorageMetrics(),
                        getStorageQuotaEstimate(),
                      ]);
                      setOfflineMetrics(m);
                      setStorageQuota(q);
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border border-rose-800/60 rounded transition flex items-center space-x-1.5"
                >
                  <span>🧹 Purge Offline Cache</span>
                </button>

                <button
                  onClick={async () => {
                    setLiveAlert("Pre-caching all topic deep-dives for offline inspection...");
                    let cachedCount = 0;
                    for (const t of topics) {
                      try {
                        const res = await fetch(`${API_BASE}/api/topics/${t.id}`);
                        if (res.ok) {
                          const data = await res.json();
                          await saveTopicDetailToIndexedDB(t.id, data);
                          cachedCount += 1;
                        }
                      } catch (_) {}
                    }
                    const m = await getOfflineStorageMetrics();
                    setOfflineMetrics(m);
                    setLiveAlert(`Successfully pre-cached ${cachedCount} topic deep-dives!`);
                    setTimeout(() => setLiveAlert(null), 3500);
                  }}
                  title="Pre-fetch and persist deep-dive stories, narrative timelines, and correlated articles into IndexedDB"
                  className="px-3 py-2 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 rounded transition flex items-center space-x-1.5"
                >
                  <span>⬇️ Pre-Cache All Deep-Dives</span>
                </button>

                <label className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/80 rounded transition flex items-center space-x-1.5 cursor-pointer">
                  <span>📥 Import Vault</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const parsed = JSON.parse(text);
                        const result = await importOfflineVault(parsed);
                        fetchTopics();
                        if (Array.isArray(parsed.bookmarks) && parsed.bookmarks.length > 0) {
                          setBookmarkedIds(parsed.bookmarks);
                          localStorage.setItem("omnifeed_bookmarks", JSON.stringify(parsed.bookmarks));
                        }
                        if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
                          setFeedSources(parsed.sources);
                          localStorage.setItem("omnifeed_sources_cache", JSON.stringify(parsed.sources));
                        }
                        if (Array.isArray(parsed.annotations) && parsed.annotations.length > 0) {
                          const noteMap: Record<number, BookmarkAnnotation> = {};
                          for (const a of parsed.annotations) {
                            if (a && a.topic_id) noteMap[a.topic_id] = a;
                          }
                          setBookmarkAnnotations((prev) => {
                            const merged = { ...prev, ...noteMap };
                            localStorage.setItem("omnifeed_bookmark_annotations", JSON.stringify(merged));
                            return merged;
                          });
                        }
                        if (Array.isArray(parsed.syncQueue) && parsed.syncQueue.length > 0) {
                          localStorage.setItem("omnifeed_sync_queue", JSON.stringify(parsed.syncQueue));
                          await saveSyncQueueToIndexedDB(parsed.syncQueue);
                          setPendingSyncCount(parsed.syncQueue.length);
                        }
                        const metrics = await getOfflineStorageMetrics();
                        setOfflineMetrics(metrics);
                        setLiveAlert(`Vault imported: ${result.topicsImported} topics, ${result.sourcesImported || 0} feeds, ${result.annotationsImported || 0} notes, ${result.bookmarksImported || 0} bookmarks, and ${result.syncQueueImported || 0} queued actions restored.`);
                        setTimeout(() => setLiveAlert(null), 3000);
                      } catch (err) {
                        alert("Failed to import vault file. Ensure it is a valid JSON vault.");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  onClick={async () => {
                    const metrics = await getOfflineStorageMetrics();
                    setOfflineMetrics(metrics);
                  }}
                  className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition flex items-center space-x-1.5"
                >
                  <span>🔄 Refresh Metrics</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  Pending Background Sync Queue: <strong className="text-slate-300">{pendingSyncCount} operations</strong>
                </span>
                {pendingSyncCount > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const queue = JSON.parse(localStorage.getItem("omnifeed_sync_queue") || "[]");
                        for (const action of queue) {
                          if (action.type === "sync_feeds") {
                            await fetch(`${API_BASE}/api/actions/sync`, { method: "POST" }).catch(() => {});
                          } else if (action.type === "add_feed" && action.payload) {
                            await fetch(`${API_BASE}/api/sources`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(action.payload),
                            }).catch(() => {});
                          } else if (action.type === "delete_feed" && action.source_id) {
                            await fetch(`${API_BASE}/api/sources/${action.source_id}`, {
                              method: "DELETE",
                            }).catch(() => {});
                          }
                        }
                        localStorage.removeItem("omnifeed_sync_queue");
                        await saveSyncQueueToIndexedDB([]);
                        setPendingSyncCount(0);
                        fetchSystemData();
                        fetchTopics();
                        const m = await getOfflineStorageMetrics();
                        setOfflineMetrics(m);
                        setLiveAlert("Sync queue replayed successfully!");
                        setTimeout(() => setLiveAlert(null), 3000);
                      } catch (err) {
                        console.error("Manual replay error:", err);
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 rounded transition flex items-center space-x-1"
                  >
                    <span>⚡ Replay Queue Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed Management Modal */}
      {showFeedsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowFeedsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition text-xs"
            >
              ✕ Close
            </button>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>📡 Feed Sources & Subscriptions</span>
                </h3>
                {feedHealthSummary && (
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                      {feedHealthSummary.uptimePct}% Uptime
                    </span>
                    <span className="bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                      ~{feedHealthSummary.avgLatency}ms
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure news wires, custom RSS/Atom feeds, and monitor real-time channel health.
              </p>
            </div>

            {/* Subscribe Form */}
            <form onSubmit={handleAddFeed} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                Subscribe to New Feed
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                    Feed Name / Publication
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ars Technica"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                    Feed Type
                  </label>
                  <select
                    value={newFeedType}
                    onChange={(e) => setNewFeedType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="tech">Technology</option>
                    <option value="general">General / Mainstream</option>
                    <option value="business">Business</option>
                    <option value="politics">Politics</option>
                    <option value="science">Science</option>
                    <option value="social">Social Media</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  RSS / Atom Feed URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {feedSubmitError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900 p-2 rounded">
                  {feedSubmitError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAddingFeed}
                className="w-full py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition shadow disabled:opacity-50"
              >
                {isAddingFeed ? "Subscribing..." : "➕ Subscribe to Feed"}
              </button>
            </form>

            {/* Active Sources List */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Active Ingestion Channels ({feedSources.length})
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const downloadUrl = `${API_BASE}/api/sources/opml`;
                      const a = document.createElement("a");
                      a.href = downloadUrl;
                      a.download = `omnifeed-subscriptions-${new Date().toISOString().slice(0, 10)}.opml`;
                      a.click();
                      setLiveAlert("OPML subscriptions exported successfully!");
                      setTimeout(() => setLiveAlert(null), 3000);
                    }}
                    title="Export feed subscriptions as standard OPML 2.0 XML document"
                    className="px-2 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition flex items-center space-x-1"
                  >
                    <span>📑 Export OPML</span>
                  </button>

                  <label
                    title="Import feeds from OPML or XML document"
                    className="px-2 py-1 text-[10px] font-semibold bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800 rounded transition flex items-center space-x-1 cursor-pointer"
                  >
                    <span>📥 Import OPML</span>
                    <input
                      type="file"
                      accept=".opml,.xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const xmlContent = await file.text();
                          const res = await fetch(`${API_BASE}/api/sources/opml`, {
                            method: "POST",
                            headers: { "Content-Type": "application/xml" },
                            body: xmlContent,
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setLiveAlert(`Imported ${data.imported_count} new feeds (${data.existing_count} existing).`);
                            setTimeout(() => setLiveAlert(null), 4000);
                            await fetchSystemData();
                          } else {
                            const errData = await res.json();
                            setLiveAlert(`OPML import failed: ${errData.detail || "Invalid format"}`);
                            setTimeout(() => setLiveAlert(null), 4000);
                          }
                        } catch (err) {
                          setLiveAlert("Failed to process OPML file.");
                          setTimeout(() => setLiveAlert(null), 3000);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/api/sources/ping-all`, { method: "POST" });
                        if (res.ok) {
                          const pingResults: Array<{ id: number; status: string; latency_ms: number }> = await res.json();
                          setFeedSources((prev) => {
                            const updated = prev.map((s) => {
                              const found = pingResults.find((p) => p.id === s.id);
                              return found ? { ...s, status: found.status, latency_ms: found.latency_ms } : s;
                            });
                            try {
                              localStorage.setItem("omnifeed_sources_cache", JSON.stringify(updated));
                            } catch (_) {}
                            return updated;
                          });
                          setLiveAlert("Health diagnostics updated for all feed sources.");
                          setTimeout(() => setLiveAlert(null), 3000);
                        }
                      } catch (e) {
                        console.error("Bulk ping failed:", e);
                      }
                    }}
                    title="Probe latency and reachability across all registered feed sources concurrently"
                    className="px-2 py-1 text-[10px] font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded transition flex items-center space-x-1"
                  >
                    <span>⚡ Ping All</span>
                  </button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {feedSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-200">{source.name}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-slate-900 text-cyan-400 rounded border border-slate-800">
                          {source.type}
                        </span>
                        <span className="text-[10px] text-emerald-400">● Active</span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800 font-mono">
                          {source.article_count !== undefined ? `${source.article_count} articles` : "0 articles"}
                        </span>
                      </div>
                      {source.url && (
                        <p className="text-[11px] text-slate-500 truncate max-w-sm">{source.url}</p>
                      )}
                      {source.latency_ms !== undefined && (
                        <div className="flex items-center space-x-1 text-[10px] pt-0.5">
                          <span
                            className={
                              source.status === "healthy"
                                ? "text-emerald-400"
                                : source.status === "degraded"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }
                          >
                            ● {source.status} ({source.latency_ms}ms)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handlePingSource(source.id)}
                        disabled={pingingSourceId === source.id}
                        title="Probe feed health and measure endpoint latency"
                        className="px-2 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                      >
                        {pingingSourceId === source.id ? "Pinging..." : "⚡ Ping"}
                      </button>
                      {source.id > 5 && (
                        <button
                          onClick={() => handleDeleteFeed(source.id)}
                          title="Unsubscribe from feed source"
                          className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-950/40 transition"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition text-xs"
            >
              ✕ Close
            </button>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-cyan-400 flex items-center space-x-2">
                <span>⌨️</span>
                <span>Keyboard Shortcuts Reference</span>
              </h3>
              <p className="text-xs text-slate-400">Navigate and triage intelligence feeds without touching the mouse.</p>
            </div>
            <div className="space-y-2 text-xs divide-y divide-slate-800/80">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Next topic cluster</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono">j</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Previous topic cluster</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono">k</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Open focused cluster deep-dive</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono">Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Toggle bookmark on focused / open topic</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono">b</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Focus search bar</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono">/</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Close open modal or clear search focus</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">Esc</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-300">Toggle this help dialog</span>
                <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
