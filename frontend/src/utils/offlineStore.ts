// Client-side IndexedDB persistence layer for Omnifeed offline intelligence
const DB_NAME = 'omnifeed_offline_db';
const DB_VERSION = 2;
const TOPICS_STORE = 'topics_store';
const DETAILS_STORE = 'details_store';
const METRICS_STORE = 'metrics_store';
const SOURCES_STORE = 'sources_store';

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

export async function clearOfflineIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, METRICS_STORE, SOURCES_STORE], 'readwrite');
    tx.objectStore(TOPICS_STORE).clear();
    tx.objectStore(DETAILS_STORE).clear();
    tx.objectStore(METRICS_STORE).clear();
    tx.objectStore(SOURCES_STORE).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  }
}

export async function importOfflineVault(vaultData: { topics?: any[]; details?: any[]; bookmarks?: number[]; sources?: any[] }): Promise<{ topicsImported: number; detailsImported: number; bookmarksImported: number; sourcesImported: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, METRICS_STORE, SOURCES_STORE], 'readwrite');
    const topicsStore = tx.objectStore(TOPICS_STORE);
    const detailsStore = tx.objectStore(DETAILS_STORE);
    const metricsStore = tx.objectStore(METRICS_STORE);
    const sourcesStore = tx.objectStore(SOURCES_STORE);

    let topicsImported = 0;
    let detailsImported = 0;
    let bookmarksImported = 0;
    let sourcesImported = 0;

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

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve({ topicsImported, detailsImported, bookmarksImported, sourcesImported });
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to import offline vault:', err);
    throw err;
  }
}

export async function getOfflineStorageMetrics(): Promise<{ topicCount: number; detailCount: number; sourceCount: number; estimatedBytes: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, SOURCES_STORE], 'readonly');
    const topicsStore = tx.objectStore(TOPICS_STORE);
    const detailsStore = tx.objectStore(DETAILS_STORE);
    const sourcesStore = tx.objectStore(SOURCES_STORE);

    const [topics, details, sources] = await Promise.all([
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
      })
    ]);

    const str = JSON.stringify(topics) + JSON.stringify(details) + JSON.stringify(sources);
    return {
      topicCount: topics.length,
      detailCount: details.length,
      sourceCount: sources.length,
      estimatedBytes: new Blob([str]).size
    };
  } catch (err) {
    return { topicCount: 0, detailCount: 0, sourceCount: 0, estimatedBytes: 0 };
  }
}
