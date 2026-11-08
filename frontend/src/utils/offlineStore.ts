// Client-side IndexedDB persistence layer for Omnifeed offline intelligence
const DB_NAME = 'omnifeed_offline_db';
const DB_VERSION = 3;
const TOPICS_STORE = 'topics_store';
const DETAILS_STORE = 'details_store';
const METRICS_STORE = 'metrics_store';
const SOURCES_STORE = 'sources_store';
const BOOKMARK_NOTES_STORE = 'bookmark_notes';

export interface BookmarkAnnotation {
  topic_id: number;
  note: string;
  tags: string[];
  updated_at: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TOPICS_STORE)) {
        db.createObjectStore(TOPICS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DETAILS_STORE)) {
        db.createObjectStore(DETAILS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(METRICS_STORE)) {
        db.createObjectStore(METRICS_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(SOURCES_STORE)) {
        db.createObjectStore(SOURCES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BOOKMARK_NOTES_STORE)) {
        db.createObjectStore(BOOKMARK_NOTES_STORE, { keyPath: 'topic_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTopicsToIndexedDB(topics: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(TOPICS_STORE, 'readwrite');
    const store = tx.objectStore(TOPICS_STORE);
    for (const topic of topics) {
      if (topic && topic.id) {
        store.put(topic);
      }
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveTopics error:', err);
  }
}

export async function getTopicsFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(TOPICS_STORE, 'readonly');
    const store = tx.objectStore(TOPICS_STORE);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB getTopics error:', err);
    return [];
  }
}

export async function saveSyncQueueToIndexedDB(queue: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(METRICS_STORE, 'readwrite');
    const store = tx.objectStore(METRICS_STORE);
    store.put({ key: 'sync_queue', queue: queue || [], updated_at: new Date().toISOString() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveSyncQueue error:', err);
  }
}

export async function getSyncQueueFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(METRICS_STORE, 'readonly');
    const store = tx.objectStore(METRICS_STORE);
    const request = store.get('sync_queue');
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result;
        resolve(res && Array.isArray(res.queue) ? res.queue : []);
      };
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('IndexedDB getSyncQueue error:', err);
    return [];
  }
}

export async function saveTopicDetailToIndexedDB(id: number, detail: any): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(DETAILS_STORE, 'readwrite');
    const store = tx.objectStore(DETAILS_STORE);
    store.put({ id, ...detail, cached_at: new Date().toISOString() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveTopicDetail error:', err);
  }
}

export async function getTopicDetailFromIndexedDB(id: number): Promise<any | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(DETAILS_STORE, 'readonly');
    const store = tx.objectStore(DETAILS_STORE);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB getTopicDetail error:', err);
    return null;
  }
}

export async function saveBookmarksToIndexedDB(ids: number[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(METRICS_STORE, 'readwrite');
    const store = tx.objectStore(METRICS_STORE);
    store.put({ key: 'bookmarked_ids', ids, updated_at: new Date().toISOString() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveBookmarks error:', err);
  }
}

export async function getBookmarksFromIndexedDB(): Promise<number[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(METRICS_STORE, 'readonly');
    const store = tx.objectStore(METRICS_STORE);
    const request = store.get('bookmarked_ids');
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result;
        resolve(res && Array.isArray(res.ids) ? res.ids : []);
      };
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('IndexedDB getBookmarks error:', err);
    return [];
  }
}

export async function saveSourcesToIndexedDB(sources: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    const store = tx.objectStore(SOURCES_STORE);
    store.clear();
    for (const source of sources) {
      if (source && source.id) {
        store.put(source);
      }
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveSources error:', err);
  }
}

export async function getSourcesFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(SOURCES_STORE, 'readonly');
    const store = tx.objectStore(SOURCES_STORE);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB getSources error:', err);
    return [];
  }
}

export async function saveBookmarkAnnotationToIndexedDB(annotation: BookmarkAnnotation): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(BOOKMARK_NOTES_STORE, 'readwrite');
    const store = tx.objectStore(BOOKMARK_NOTES_STORE);
    store.put(annotation);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveBookmarkAnnotation error:', err);
  }
}

export async function getBookmarkAnnotationsFromIndexedDB(): Promise<Record<number, BookmarkAnnotation>> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(BOOKMARK_NOTES_STORE, 'readonly');
    const store = tx.objectStore(BOOKMARK_NOTES_STORE);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const map: Record<number, BookmarkAnnotation> = {};
        for (const item of request.result || []) {
          if (item && item.topic_id) {
            map[item.topic_id] = item;
          }
        }
        resolve(map);
      };
      request.onerror = () => resolve({});
    });
  } catch (err) {
    console.warn('IndexedDB getBookmarkAnnotations error:', err);
    return {};
  }
}

export async function deleteBookmarkAnnotationFromIndexedDB(topicId: number): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(BOOKMARK_NOTES_STORE, 'readwrite');
    const store = tx.objectStore(BOOKMARK_NOTES_STORE);
    store.delete(topicId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB deleteBookmarkAnnotation error:', err);
  }
}

export async function clearOfflineIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, METRICS_STORE, SOURCES_STORE, BOOKMARK_NOTES_STORE], 'readwrite');
    tx.objectStore(TOPICS_STORE).clear();
    tx.objectStore(DETAILS_STORE).clear();
    tx.objectStore(METRICS_STORE).clear();
    tx.objectStore(SOURCES_STORE).clear();
    tx.objectStore(BOOKMARK_NOTES_STORE).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  }
}

export async function importOfflineVault(vaultData: { topics?: any[]; details?: any[]; bookmarks?: number[]; sources?: any[]; annotations?: BookmarkAnnotation[]; syncQueue?: any[] }): Promise<{ topicsImported: number; detailsImported: number; bookmarksImported: number; sourcesImported: number; annotationsImported: number; syncQueueImported: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, METRICS_STORE, SOURCES_STORE, BOOKMARK_NOTES_STORE], 'readwrite');
    const topicsStore = tx.objectStore(TOPICS_STORE);
    const detailsStore = tx.objectStore(DETAILS_STORE);
    const metricsStore = tx.objectStore(METRICS_STORE);
    const sourcesStore = tx.objectStore(SOURCES_STORE);
    const notesStore = tx.objectStore(BOOKMARK_NOTES_STORE);

    let topicsImported = 0;
    let detailsImported = 0;
    let bookmarksImported = 0;
    let sourcesImported = 0;
    let annotationsImported = 0;
    let syncQueueImported = 0;

    if (Array.isArray(vaultData.topics)) {
      for (const t of vaultData.topics) {
        if (t && t.id) {
          topicsStore.put(t);
          topicsImported += 1;
        }
      }
    }

    if (Array.isArray(vaultData.details)) {
      for (const d of vaultData.details) {
        if (d && d.id) {
          detailsStore.put(d);
          detailsImported += 1;
        }
      }
    }

    if (Array.isArray(vaultData.bookmarks) && vaultData.bookmarks.length > 0) {
      metricsStore.put({ key: 'bookmarked_ids', ids: vaultData.bookmarks, updated_at: new Date().toISOString() });
      bookmarksImported = vaultData.bookmarks.length;
    }

    if (Array.isArray(vaultData.sources) && vaultData.sources.length > 0) {
      for (const s of vaultData.sources) {
        if (s && s.id) {
          sourcesStore.put(s);
          sourcesImported += 1;
        }
      }
    }

    if (Array.isArray(vaultData.annotations) && vaultData.annotations.length > 0) {
      for (const a of vaultData.annotations) {
        if (a && a.topic_id) {
          notesStore.put(a);
          annotationsImported += 1;
        }
      }
    }

    if (Array.isArray(vaultData.syncQueue) && vaultData.syncQueue.length > 0) {
      metricsStore.put({ key: 'sync_queue', queue: vaultData.syncQueue, updated_at: new Date().toISOString() });
      syncQueueImported = vaultData.syncQueue.length;
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve({ topicsImported, detailsImported, bookmarksImported, sourcesImported, annotationsImported, syncQueueImported });
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to import offline vault:', err);
    throw err;
  }
}

export async function getStorageQuotaEstimate(): Promise<{ usageBytes: number; quotaBytes: number; percentUsed: number }> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      return {
        usageBytes: usage,
        quotaBytes: quota,
        percentUsed: Number(percent.toFixed(2))
      };
    }
  } catch (err) {
    console.warn('Quota estimate failed:', err);
  }
  return { usageBytes: 0, quotaBytes: 0, percentUsed: 0 };
}

export async function compactOfflineVault(preserveLimit = 50): Promise<{ detailsPruned: number; remainingDetails: number }> {
  try {
    const db = await openDatabase();
    const bookmarkedIds = await getBookmarksFromIndexedDB();
    const bookmarkSet = new Set(bookmarkedIds.map((id) => Number(id)));

    const tx = db.transaction(DETAILS_STORE, 'readwrite');
    const store = tx.objectStore(DETAILS_STORE);
    const allDetailsRequest = store.getAll();

    return new Promise((resolve, reject) => {
      allDetailsRequest.onsuccess = () => {
        const allDetails: any[] = allDetailsRequest.result || [];
        // Separate bookmarked details from unbookmarked details
        const unbookmarkedDetails = allDetails.filter((d) => !bookmarkSet.has(Number(d.id)));

        // Sort unbookmarked by oldest cached_at first
        unbookmarkedDetails.sort((a, b) => {
          const dateA = a.cached_at ? new Date(a.cached_at).getTime() : 0;
          const dateB = b.cached_at ? new Date(b.cached_at).getTime() : 0;
          return dateA - dateB;
        });

        const targetPruneCount = Math.max(0, unbookmarkedDetails.length - preserveLimit);
        let pruned = 0;

        for (let i = 0; i < targetPruneCount; i++) {
          const item = unbookmarkedDetails[i];
          if (item && item.id) {
            store.delete(item.id);
            pruned += 1;
          }
        }

        tx.oncomplete = () => {
          resolve({
            detailsPruned: pruned,
            remainingDetails: allDetails.length - pruned
          });
        };
        tx.onerror = () => reject(tx.error);
      };
      allDetailsRequest.onerror = () => reject(allDetailsRequest.error);
    });
  } catch (err) {
    console.error('Failed to compact offline vault:', err);
    return { detailsPruned: 0, remainingDetails: 0 };
  }
}

export async function getOfflineStorageMetrics(): Promise<{ topicCount: number; detailCount: number; sourceCount: number; annotationCount: number; estimatedBytes: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, SOURCES_STORE, BOOKMARK_NOTES_STORE], 'readonly');
    const topicsStore = tx.objectStore(TOPICS_STORE);
    const detailsStore = tx.objectStore(DETAILS_STORE);
    const sourcesStore = tx.objectStore(SOURCES_STORE);
    const notesStore = tx.objectStore(BOOKMARK_NOTES_STORE);

    const [topics, details, sources, notes] = await Promise.all([
      new Promise<any[]>((resolve) => {
        const req = topicsStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }),
      new Promise<any[]>((resolve) => {
        const req = detailsStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }),
      new Promise<any[]>((resolve) => {
        const req = sourcesStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }),
      new Promise<any[]>((resolve) => {
        const req = notesStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      })
    ]);

    const str = JSON.stringify(topics) + JSON.stringify(details) + JSON.stringify(sources) + JSON.stringify(notes);
    return {
      topicCount: topics.length,
      detailCount: details.length,
      sourceCount: sources.length,
      annotationCount: notes.length,
      estimatedBytes: new Blob([str]).size
    };
  } catch (err) {
    return { topicCount: 0, detailCount: 0, sourceCount: 0, annotationCount: 0, estimatedBytes: 0 };
  }
}
