// Client-side IndexedDB persistence layer for Omnifeed offline intelligence
const DB_NAME = 'omnifeed_offline_db';
const DB_VERSION = 1;
const TOPICS_STORE = 'topics_store';
const DETAILS_STORE = 'details_store';
const METRICS_STORE = 'metrics_store';

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

export async function clearOfflineIndexedDB(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE, METRICS_STORE], 'readwrite');
    tx.objectStore(TOPICS_STORE).clear();
    tx.objectStore(DETAILS_STORE).clear();
    tx.objectStore(METRICS_STORE).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  }
}

export async function getOfflineStorageMetrics(): Promise<{ topicCount: number; detailCount: number; estimatedBytes: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([TOPICS_STORE, DETAILS_STORE], 'readonly');
    const topicsStore = tx.objectStore(TOPICS_STORE);
    const detailsStore = tx.objectStore(DETAILS_STORE);

    const [topics, details] = await Promise.all([
      new Promise<any[]>((resolve) => {
        const req = topicsStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }),
      new Promise<any[]>((resolve) => {
        const req = detailsStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      })
    ]);

    const str = JSON.stringify(topics) + JSON.stringify(details);
    return {
      topicCount: topics.length,
      detailCount: details.length,
      estimatedBytes: new Blob([str]).size
    };
  } catch (err) {
    return { topicCount: 0, detailCount: 0, estimatedBytes: 0 };
  }
}
